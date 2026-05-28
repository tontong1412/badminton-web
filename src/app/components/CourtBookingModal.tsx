'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
} from '@mui/material'
import { Court, Venue } from '@/type'
import Transition from './ModalTransition'
import LoginModal from './LoginModal'
import { useTranslation } from 'react-i18next'
import bookingsService from '../services/bookings'
import couponService, { ValidateCouponResponse } from '../services/coupons'
import { useAppDispatch, useAppSelector } from '../libs/redux/store'
import { addBooking, addBookings, setError } from '../libs/redux/slices/bookingSlice'
import moment from 'moment'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

interface BookingItemInput {
  courtID: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface CourtBookingModalProps {
  open: boolean;
  onClose: () => void;
  courts: Court[];
  venue: Venue;
  preselectedSlot?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  bookingItems?: BookingItemInput[];
  onBookingComplete: (isGuest: boolean) => void;
}

const steps = ['Enter Details', 'Confirm Booking']

export default function CourtBookingModal({
  open,
  onClose,
  courts,
  venue,
  preselectedSlot,
  bookingItems,
  onBookingComplete,
}: CourtBookingModalProps) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector((state) => state.app.user)
  const language = useAppSelector((state) => state.app.language)

  const [activeStep, setActiveStep] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestFieldErrors, setGuestFieldErrors] = useState({ name: false, phone: false, email: false })
  const [userPhone, setUserPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setErrorState] = useState<string | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const termsRef = useRef<HTMLLabelElement>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const [bookingType, setBookingType] = useState<'single' | 'recurring'>('single')
  const [recurringCourtID, setRecurringCourtID] = useState('')
  const [recurringStartTime, setRecurringStartTime] = useState('08:00')
  const [recurringEndTime, setRecurringEndTime] = useState('10:00')
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly'>('weekly')
  const [recurringDays, setRecurringDays] = useState<number[]>([1])
  const [rangeStart, setRangeStart] = useState(moment().format('YYYY-MM-DD'))
  const [rangeEnd, setRangeEnd] = useState(moment().add(1, 'month').format('YYYY-MM-DD'))
  const [recurringConflicts, setRecurringConflicts] = useState<{ date: string; reason: string }[]>([])

  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<ValidateCouponResponse | null>(null)
  const [couponValidating, setCouponValidating] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const isItemsPreselected = Boolean(bookingItems && bookingItems.length > 0)

  /** Mirrors backend calculateTotalPriceWithRules — segments the window and applies rules. */
  const getPriceForRange = (court: (typeof courts)[0], start: string, end: string): number => {
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const rules = court.pricingRules ?? []
    const bookingStart = toMins(start)
    const bookingEnd = toMins(end)

    if (rules.length === 0) {
      return Number(((court.pricePerHour / 60) * (bookingEnd - bookingStart)).toFixed(2))
    }

    const boundaries = new Set<number>([bookingStart, bookingEnd])
    for (const rule of rules) {
      const rs = toMins(rule.startTime)
      const re = toMins(rule.endTime)
      if (rs > bookingStart && rs < bookingEnd) boundaries.add(rs)
      if (re > bookingStart && re < bookingEnd) boundaries.add(re)
    }
    const sorted = Array.from(boundaries).sort((a, b) => a - b)
    let total = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      const segStart = sorted[i], segEnd = sorted[i + 1]
      const rule = rules.find((r) => toMins(r.startTime) <= segStart && toMins(r.endTime) >= segEnd)
      total += ((rule ? rule.pricePerHour : court.pricePerHour) / 60) * (segEnd - segStart)
    }
    return Number(total.toFixed(2))
  }

  const calculateDuration = () => {
    if (isItemsPreselected && bookingItems) {
      // Total minutes across all items
      return bookingItems.reduce((sum, item) => {
        const start = moment(item.startTime, 'HH:mm')
        const end = moment(item.endTime, 'HH:mm')
        return sum + end.diff(start, 'minutes')
      }, 0)
    }
    if (!startTime || !endTime) return 0
    const start = moment(startTime, 'HH:mm')
    const end = moment(endTime, 'HH:mm')
    return end.diff(start, 'minutes')
  }

  const calculatePrice = () => {
    if (isItemsPreselected && bookingItems) {
      return bookingItems.reduce((sum, item) => {
        const court = courts.find((c) => c.id === item.courtID)
        if (!court) return sum
        return sum + getPriceForRange(court, item.startTime, item.endTime)
      }, 0)
    }
    if (!startTime || !endTime) return 0
    return courts.reduce((sum, court) => sum + getPriceForRange(court, startTime, endTime), 0)
  }

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const isAdmin = currentUser?.role === 'admin'
  const maxRangeMonths = isAdmin ? null : 2

  const calcRecurringDates = (): string[] => {
    const dates: string[] = []
    const start = moment(rangeStart)
    const end = moment(rangeEnd)
    for (let d = start.clone(); d.isSameOrBefore(end, 'day'); d.add(1, 'day')) {
      if (recurringPattern === 'daily' || (recurringPattern === 'weekly' && recurringDays.includes(d.day()))) {
        dates.push(d.format('YYYY-MM-DD'))
      }
    }
    return dates
  }

  const recurringCourt = courts.find((c) => c.id === recurringCourtID)
  const recurringPricePerSession = recurringCourt ? getPriceForRange(recurringCourt, recurringStartTime, recurringEndTime) : 0
  const recurringDatesPreview = calcRecurringDates()
  const recurringTotalPrice = recurringPricePerSession * recurringDatesPreview.length

  const handleNext = () => {
    if (activeStep === 0) {
      if (currentUser) {
        const profilePhone = currentUser.player.contact?.tel
        if (!profilePhone && !userPhone) {
          setErrorState('Please enter your phone number so the venue can contact you.')
          return
        }
      } else if (!guestName || !guestPhone || !guestEmail) {
        setGuestFieldErrors({ name: !guestName, phone: !guestPhone, email: !guestEmail })
        setErrorState(t('booking.fillRequiredFields'))
        return
      }
      if (bookingType === 'recurring') {
        if (!recurringCourtID) { setErrorState('Please select a court.'); return }
        if (moment(recurringStartTime, 'HH:mm').isSameOrAfter(moment(recurringEndTime, 'HH:mm'))) {
          setErrorState('End time must be after start time.'); return
        }
        if (moment(rangeStart).isAfter(moment(rangeEnd))) {
          setErrorState('Range end must be after range start.'); return
        }
        if (maxRangeMonths !== null && moment(rangeEnd).isAfter(moment(rangeStart).add(maxRangeMonths, 'months'))) {
          setErrorState(`Recurring booking cannot span more than ${maxRangeMonths} months.`); return
        }
        if (recurringPattern === 'weekly' && recurringDays.length === 0) {
          setErrorState('Select at least one day of the week.'); return
        }
        if (calcRecurringDates().length === 0) {
          setErrorState('No dates generated for this range and pattern.'); return
        }
      }
    }
    setErrorState(null)
    setRecurringConflicts([])
    setActiveStep(activeStep + 1)
  }

  const handleBack = () => {
    setActiveStep(activeStep - 1)
    setErrorState(null)
  }

  const handleSubmit = async() => {
    if (!agreeTerms) {
      setTermsError(true)
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (bookingType === 'recurring') {
      try {
        setLoading(true)
        setRecurringConflicts([])
        await axios.post(
          `${SERVICE_ENDPOINT}/bookings/recurring`,
          {
            courtID: recurringCourtID,
            startTime: recurringStartTime,
            endTime: recurringEndTime,
            pattern: recurringPattern,
            rangeStart,
            rangeEnd,
            daysOfWeek: recurringPattern === 'weekly' ? recurringDays : undefined,
            note: note || undefined,
          },
          { withCredentials: true },
        )
        setErrorState(null)
        setActiveStep(0)
        setAgreeTerms(false)
        setNote('')
        setBookingType('single')
        setRecurringConflicts([])
        onBookingComplete(false)
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as { message?: string; conflicts?: { date: string; reason: string }[] }
          if (err.response?.status === 409 && data?.conflicts) {
            setRecurringConflicts(data.conflicts)
            setErrorState(`${data.conflicts.length} date(s) could not be booked due to conflicts.`)
          } else {
            setErrorState(data?.message ?? 'Failed to create recurring booking.')
          }
        } else {
          setErrorState('Failed to create recurring booking.')
        }
      } finally {
        setLoading(false)
      }
      return
    }

    const bookingStartAt = isItemsPreselected && bookingItems
      ? moment(`${bookingItems[0].date} ${bookingItems[0].startTime}`, 'YYYY-MM-DD HH:mm')
      : moment(`${selectedDate} ${startTime}`, 'YYYY-MM-DD HH:mm')
    if (bookingStartAt.isSameOrBefore(moment())) {
      setErrorState(t('booking.pastTimeNotAllowed'))
      return
    }

    try {
      setLoading(true)

      const effectiveItems = isItemsPreselected && bookingItems
        ? bookingItems
        : courts.map((court) => ({
          courtID: court.id,
          date: selectedDate,
          startTime,
          endTime,
        }))

      const result = await bookingsService.createBundle({
        items: effectiveItems,
        ...(!currentUser?.id && {
          guestName,
          guestPhone,
          guestEmail,
        }),
        ...(currentUser?.id && (userPhone || currentUser.player.contact?.tel) && {
          guestPhone: userPhone || currentUser.player.contact?.tel,
        }),
        ...(note && { note }),
        ...(couponResult && { couponCode: couponResult.code }),
      })

      if ('bookings' in result) {
        // multi-court bundle
        dispatch(addBookings(result.bookings))
      } else {
        // single court
        dispatch(addBooking(result))
      }

      setErrorState(null)
      setActiveStep(0)
      onBookingComplete(!currentUser?.id)

      // Reset form
      setSelectedDate('')
      setStartTime('')
      setEndTime('')
      setGuestName('')
      setGuestPhone('')
      setGuestEmail('')
      setUserPhone('')
      setNote('')
      setAgreeTerms(false)
      setCouponCode('')
      setCouponResult(null)
      setCouponError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Booking failed'
      setErrorState(message)
      dispatch(setError(message))
      console.error('Booking error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCoupon = async() => {
    if (!couponCode.trim()) return
    const venueID = venue.id
    const totalPrice = bookingType === 'recurring' ? recurringTotalPrice : calculatePrice()
    setCouponValidating(true)
    setCouponError(null)
    setCouponResult(null)
    try {
      const result = await couponService.validate({ code: couponCode.trim(), venueID, totalPrice })
      setCouponResult(result)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setCouponError((err.response?.data as { message?: string })?.message ?? 'Invalid coupon.')
      } else {
        setCouponError('Could not apply coupon.')
      }
    } finally {
      setCouponValidating(false)
    }
  }

  const handleClose = () => {
    setActiveStep(0)
    setSelectedDate('')
    setStartTime('')
    setEndTime('')
    setGuestName('')
    setGuestPhone('')
    setGuestEmail('')
    setGuestFieldErrors({ name: false, phone: false, email: false })
    setUserPhone('')
    setNote('')
    setAgreeTerms(false)
    setErrorState(null)
    setBookingType('single')
    setRecurringCourtID(courts[0]?.id ?? '')
    setRecurringStartTime('08:00')
    setRecurringEndTime('10:00')
    setRecurringPattern('weekly')
    setRecurringDays([1])
    setRangeStart(moment().format('YYYY-MM-DD'))
    setRangeEnd(moment().add(1, 'month').format('YYYY-MM-DD'))
    setRecurringConflicts([])
    setCouponCode('')
    setCouponResult(null)
    setCouponError(null)
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const seedDate: string = preselectedSlot?.date || (isItemsPreselected ? bookingItems?.[0]?.date : '') || ''
    const seedStart: string = preselectedSlot?.startTime || (isItemsPreselected ? bookingItems?.[0]?.startTime : '') || ''
    const seedEnd: string = preselectedSlot?.endTime || (isItemsPreselected ? bookingItems?.[0]?.endTime : '') || ''
    const seedCourtID: string = (isItemsPreselected ? bookingItems?.[0]?.courtID : '') || courts[0]?.id || ''
    if (preselectedSlot) {
      setSelectedDate(seedDate)
      setStartTime(seedStart)
      setEndTime(seedEnd)
    }
    if (seedStart) setRecurringStartTime(seedStart)
    if (seedEnd) setRecurringEndTime(seedEnd)
    if (seedDate) {
      setRecurringDays([moment(seedDate).day()])
      setRangeStart(seedDate)
      setRangeEnd(moment(seedDate).add(1, 'month').format('YYYY-MM-DD'))
    }
    if (seedCourtID) setRecurringCourtID(seedCourtID)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedSlot, bookingItems])

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('booking.bookCourt')}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {activeStep === 0 && (
              <Box>
                {currentUser && (
                  <Box sx={{ mb: 2 }}>
                    <ToggleButtonGroup
                      value={bookingType}
                      exclusive
                      onChange={(_, v) => {
                        if (!v) return
                        if (v === 'recurring') {
                          const src = isItemsPreselected && bookingItems?.[0]
                          const t1 = src ? src.startTime : startTime
                          const t2 = src ? src.endTime : endTime
                          const d = src ? src.date : selectedDate
                          if (t1) setRecurringStartTime(t1)
                          if (t2) setRecurringEndTime(t2)
                          if (d) {
                            setRecurringDays([moment(d).day()])
                            setRangeStart(d)
                            setRangeEnd(moment(d).add(1, 'month').format('YYYY-MM-DD'))
                          }
                        }
                        setBookingType(v)
                      }}
                      size="small"
                    >
                      <ToggleButton value="single">One-time</ToggleButton>
                      <ToggleButton value="recurring">Recurring</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}

                {currentUser ? (
                  <Box sx={{ mb: 2, p: 2, bgcolor: '#f5efe8', borderRadius: 1.5, border: '1px solid #e8d8c8' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#80644f' }}>
                      Booking as
                    </Typography>
                    <Typography variant="body2">
                      <strong>Name:</strong> {currentUser.player.displayName.en || currentUser.player.displayName.th || currentUser.player.officialName.en || currentUser.player.officialName.th || '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {currentUser.email}
                    </Typography>
                    {currentUser.player.contact?.tel ? (
                      <Typography variant="body2">
                        <strong>Phone:</strong> {currentUser.player.contact.tel}
                      </Typography>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        label="Phone number"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        sx={{ mt: 1.5 }}
                        required
                        helperText="Required so the venue can contact you"
                      />
                    )}
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5efe8', borderRadius: 1.5, border: '1px solid #e8d8c8', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 160 }}>
                        Have an account? Book faster without filling this in.
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => setLoginModalOpen(true)} sx={{ borderColor: '#80644f', color: '#80644f', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        Sign In
                      </Button>
                      <Button size="small" href="/register" sx={{ color: '#80644f', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        Sign Up
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">or continue as guest</Typography></Divider>
                    <TextField
                      size='small'
                      fullWidth
                      label={t('booking.name')}
                      value={guestName}
                      onChange={(e) => { setGuestName(e.target.value); setGuestFieldErrors((p) => ({ ...p, name: false })) }}
                      sx={{ mb: 2 }}
                      required
                      error={guestFieldErrors.name}
                      helperText={guestFieldErrors.name ? t('booking.fillRequiredFields') : undefined}
                    />
                    <TextField
                      size='small'
                      fullWidth
                      label={t('booking.phone')}
                      value={guestPhone}
                      onChange={(e) => { setGuestPhone(e.target.value); setGuestFieldErrors((p) => ({ ...p, phone: false })) }}
                      sx={{ mb: 2 }}
                      required
                      error={guestFieldErrors.phone}
                      helperText={guestFieldErrors.phone ? t('booking.fillRequiredFields') : undefined}
                    />
                    <TextField
                      size='small'
                      fullWidth
                      label={t('booking.email')}
                      type="email"
                      value={guestEmail}
                      onChange={(e) => { setGuestEmail(e.target.value); setGuestFieldErrors((p) => ({ ...p, email: false })) }}
                      sx={{ mb: 2 }}
                      required
                      error={guestFieldErrors.email}
                      helperText={guestFieldErrors.email ? t('booking.fillRequiredFields') : undefined}
                    />
                  </>
                )}

                {bookingType === 'recurring' && currentUser && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                    {courts.length > 1 && (
                      <FormControl fullWidth size="small">
                        <InputLabel>Court</InputLabel>
                        <Select value={recurringCourtID} label="Court" onChange={(e) => setRecurringCourtID(e.target.value)}>
                          {courts.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Start Time</InputLabel>
                        <Select value={recurringStartTime} label="Start Time" onChange={(e) => setRecurringStartTime(e.target.value)}>
                          {Array.from({ length: 48 }, (_, i) => {
                            const h = Math.floor(i / 2).toString().padStart(2, '0')
                            const m = i % 2 === 0 ? '00' : '30'
                            const val = `${h}:${m}`
                            return <MenuItem key={val} value={val}>{val}</MenuItem>
                          })}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>End Time</InputLabel>
                        <Select value={recurringEndTime} label="End Time" onChange={(e) => setRecurringEndTime(e.target.value)}>
                          {Array.from({ length: 48 }, (_, i) => {
                            const h = Math.floor(i / 2).toString().padStart(2, '0')
                            const m = i % 2 === 0 ? '00' : '30'
                            const val = `${h}:${m}`
                            return <MenuItem key={val} value={val}>{val}</MenuItem>
                          })}
                        </Select>
                      </FormControl>
                    </Box>

                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Repeat</Typography>
                      <ToggleButtonGroup
                        value={recurringPattern}
                        exclusive
                        onChange={(_, v) => { if (v) setRecurringPattern(v) }}
                        size="small"
                      >
                        <ToggleButton value="weekly">Weekly</ToggleButton>
                        <ToggleButton value="daily">Every Day</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    {recurringPattern === 'weekly' && (
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Days</Typography>
                        <ToggleButtonGroup
                          value={recurringDays}
                          onChange={(_, v: number[]) => { if (v.length > 0) setRecurringDays(v) }}
                          size="small"
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {DAY_LABELS.map((label, i) => (
                            <ToggleButton key={i} value={i} sx={{ minWidth: 44 }}>{label}</ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="From"
                        type="date"
                        size="small"
                        fullWidth
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        inputProps={{ min: moment().format('YYYY-MM-DD') }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="To"
                        type="date"
                        size="small"
                        fullWidth
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        inputProps={{
                          min: rangeStart,
                          ...(maxRangeMonths !== null ? { max: moment(rangeStart).add(maxRangeMonths, 'months').format('YYYY-MM-DD') } : {}),
                        }}
                        InputLabelProps={{ shrink: true }}
                        helperText={!isAdmin ? 'Max 2 months' : undefined}
                      />
                    </Box>

                    {recurringDatesPreview.length > 0 && (
                      <Box sx={{ bgcolor: '#faf7f5', borderRadius: 1, p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {recurringDatesPreview.length} session{recurringDatesPreview.length !== 1 ? 's' : ''} · first {Math.min(5, recurringDatesPreview.length)}:{' '}
                          {recurringDatesPreview.slice(0, 5).map((d) => moment(d).format('D MMM')).join(', ')}
                          {recurringDatesPreview.length > 5 ? ` +${recurringDatesPreview.length - 5} more` : ''}
                        </Typography>
                        {recurringCourt && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Est. total: {recurringTotalPrice.toFixed(2)} {recurringCourt.currency} · {recurringPricePerSession.toFixed(2)} {recurringCourt.currency}/session
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                <TextField
                  fullWidth
                  label={t('booking.note')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  multiline
                  rows={3}
                />
              </Box>
            )}

            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {bookingType === 'recurring' ? 'Recurring Booking Summary' : t('booking.bookingSummary')}
                </Typography>

                {bookingType === 'recurring' ? (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.venue')}:</strong> {venue.name.en || venue.name.th}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Court:</strong> {recurringCourt?.name ?? recurringCourtID}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Time:</strong> {recurringStartTime} – {recurringEndTime}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Repeat:</strong>{' '}
                      {recurringPattern === 'weekly'
                        ? `Weekly on ${recurringDays.map((d) => DAY_LABELS[d]).join(', ')}`
                        : 'Every day'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Date range:</strong> {moment(rangeStart).format('D MMM YYYY')} – {moment(rangeEnd).format('D MMM YYYY')}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Sessions:</strong> {recurringDatesPreview.length}
                      {recurringDatesPreview.length > 0 && (
                        <>
                          {' '}· first {Math.min(3, recurringDatesPreview.length)}: {recurringDatesPreview.slice(0, 3).map((d) => moment(d).format('D MMM')).join(', ')}
                          {recurringDatesPreview.length > 3 ? ` +${recurringDatesPreview.length - 3} more` : ''}
                        </>
                      )}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      <strong>Est. Total:</strong> {recurringTotalPrice.toFixed(2)} {recurringCourt?.currency || 'THB'}
                    </Typography>
                    {recurringConflicts.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                        {recurringConflicts.map((c) => (
                          <Chip
                            key={c.date}
                            label={`${moment(c.date).format('D MMM')} – ${c.reason}`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.venue')}:</strong> {venue.name.en || venue.name.th}
                    </Typography>
                    {isItemsPreselected && bookingItems ? (
                      bookingItems.map((item) => {
                        const court = courts.find((c) => c.id === item.courtID)
                        const durationMins = moment(item.endTime, 'HH:mm').diff(moment(item.startTime, 'HH:mm'), 'minutes')
                        const price = court ? getPriceForRange(court, item.startTime, item.endTime) : 0
                        return (
                          <Box key={`${item.courtID}-${item.startTime}`} sx={{ mb: 1, pl: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                            <Typography variant="body2"><strong>{court?.name ?? item.courtID}</strong></Typography>
                            <Typography variant="body2">{t('booking.date')}: {moment(item.date).format('DD/MM/YYYY')}</Typography>
                            <Typography variant="body2">{t('booking.time')}: {item.startTime} – {item.endTime} ({durationMins} {t('booking.minutes')})</Typography>
                            <Typography variant="body2">{t('booking.price')}: {price.toFixed(2)} {court?.currency || 'THB'}</Typography>
                          </Box>
                        )
                      })
                    ) : (
                      <>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>{t('booking.courts')}:</strong> {courts.map((court) => court.name).join(', ')}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>{t('booking.date')}:</strong> {moment(selectedDate).format('DD/MM/YYYY')}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>{t('booking.time')}:</strong> {startTime} - {endTime}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>{t('booking.duration')}:</strong> {calculateDuration()} {t('booking.minutes')}
                        </Typography>
                      </>
                    )}
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      <strong>{t('booking.total')}:</strong>{' '}
                      {couponResult ? (
                        <>
                          <Box component="span" sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '0.9em', mr: 1 }}>
                            {calculatePrice().toFixed(2)}
                          </Box>
                          <Box component="span" sx={{ color: 'success.main' }}>
                            {couponResult.finalPrice.toFixed(2)} {courts[0]?.currency || 'THB'}
                          </Box>
                        </>
                      ) : (
                        <>{calculatePrice().toFixed(2)} {courts[0]?.currency || 'THB'}</>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* Coupon code input (single bookings only) */}
                {bookingType !== 'recurring' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Discount Coupon</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase())
                          setCouponResult(null)
                          setCouponError(null)
                        }}
                        placeholder="Enter code"
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                        disabled={!!couponResult}
                      />
                      {couponResult ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={() => { setCouponResult(null); setCouponCode(''); setCouponError(null) }}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || couponValidating}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {couponValidating ? <CircularProgress size={16} /> : 'Apply'}
                        </Button>
                      )}
                    </Box>
                    {couponError && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {couponError}
                      </Typography>
                    )}
                    {couponResult && (
                      <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                        {couponResult.discountType === 'percentage'
                          ? `${couponResult.discountValue}% off`
                          : `${couponResult.discountAmount.toFixed(2)} ${courts[0]?.currency || 'THB'} off`}
                        {' '}— saving {couponResult.discountAmount.toFixed(2)} {courts[0]?.currency || 'THB'}
                      </Typography>
                    )}
                  </Box>
                )}

                {venue.termsAndConditions && (venue.termsAndConditions.th || venue.termsAndConditions.en) && (
                  <Box sx={{ mt: 2, mb: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider', maxHeight: 160, overflowY: 'auto' }}>
                    <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>Terms &amp; Conditions</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {(language === 'th' ? venue.termsAndConditions.th : venue.termsAndConditions.en)
                        || venue.termsAndConditions.th
                        || venue.termsAndConditions.en}
                    </Typography>
                  </Box>
                )}

                <FormControlLabel
                  ref={termsRef}
                  control={
                    <Checkbox
                      checked={agreeTerms}
                      onChange={(e) => {
                        setAgreeTerms(e.target.checked)
                        if (e.target.checked) setTermsError(false)
                      }}
                    />
                  }
                  label={venue.termsAndConditions && (venue.termsAndConditions.th || venue.termsAndConditions.en) ? 'I have read and agree to the Terms & Conditions' : t('booking.agreeTerms')}
                />
                {termsError && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 4 }}>
                    Please accept the terms and conditions to continue.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>{t('booking.cancel')}</Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>{t('booking.back')}</Button>
          )}
          {activeStep < steps.length - 1 && (
            <Button onClick={handleNext} variant="contained" color="primary">
              {t('booking.next')}
            </Button>
          )}
          {activeStep === steps.length - 1 && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={loading || (bookingType === 'recurring' && recurringDatesPreview.length === 0)}
            >
              {loading ? <CircularProgress size={24} /> : bookingType === 'recurring' ? `Book (${recurringDatesPreview.length} session${recurringDatesPreview.length !== 1 ? 's' : ''})` : t('booking.confirmBooking')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <LoginModal visible={loginModalOpen} setVisible={setLoginModalOpen} />
    </>
  )
}
