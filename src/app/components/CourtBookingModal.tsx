'use client'

import { useEffect, useState } from 'react'
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
} from '@mui/material'
import { Court, Venue } from '@/type'
import BookingAvailability from './BookingAvailability'
import Transition from './ModalTransition'
import LoginModal from './LoginModal'
import { useTranslation } from 'react-i18next'
import bookingsService from '../services/bookings'
import { useAppDispatch, useAppSelector } from '../libs/redux/store'
import { addBooking, addBookings, setError } from '../libs/redux/slices/bookingSlice'
import moment from 'moment'

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

  const [activeStep, setActiveStep] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setErrorState] = useState<string | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const isItemsPreselected = Boolean(bookingItems && bookingItems.length > 0)
  const isSlotPreselected = Boolean(preselectedSlot?.date && preselectedSlot?.startTime && preselectedSlot?.endTime)
  const isPreselected = isItemsPreselected || isSlotPreselected

  const handleSlotSelected = (date: string, start: string, end: string) => {
    setSelectedDate(date)
    setStartTime(start)
    setEndTime(end)
  }

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

  const handleNext = () => {
    if (activeStep === 0) {
      if (currentUser) {
        const profilePhone = currentUser.player.contact?.tel
        if (!profilePhone && !userPhone) {
          setErrorState('Please enter your phone number so the venue can contact you.')
          return
        }
      } else if (!guestName || !guestPhone) {
        setErrorState(t('booking.fillRequiredFields'))
        return
      }
    }
    setErrorState(null)
    setActiveStep(activeStep + 1)
  }

  const handleBack = () => {
    setActiveStep(activeStep - 1)
    setErrorState(null)
  }

  const handleSubmit = async() => {
    if (!agreeTerms) {
      setErrorState(t('booking.mustAgreeTerms'))
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
      const bookerType: 'user' | 'guest' = currentUser?.id ? 'user' : 'guest'

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Booking failed'
      setErrorState(message)
      dispatch(setError(message))
      console.error('Booking error:', err)
    } finally {
      setLoading(false)
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
    setUserPhone('')
    setNote('')
    setAgreeTerms(false)
    setErrorState(null)
    onClose()
  }

  useEffect(() => {
    if (open && preselectedSlot) {
      setSelectedDate(preselectedSlot.date)
      setStartTime(preselectedSlot.startTime)
      setEndTime(preselectedSlot.endTime)
    }
  }, [open, preselectedSlot])

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
                    onChange={(e) => setGuestName(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                  <TextField
                    size='small'
                    fullWidth
                    label={t('booking.phone')}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                  <TextField
                    size='small'
                    fullWidth
                    label={t('booking.email')}
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                </>
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
                {t('booking.bookingSummary')}
              </Typography>

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
                  <strong>{t('booking.total')}:</strong> {calculatePrice().toFixed(2)} {courts[0]?.currency || 'THB'}
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                }
                label={t('booking.agreeTerms')}
              />
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
            disabled={loading || !agreeTerms}
          >
            {loading ? <CircularProgress size={24} /> : t('booking.confirmBooking')}
          </Button>
        )}
      </DialogActions>
    </Dialog>

    <LoginModal visible={loginModalOpen} setVisible={setLoginModalOpen} />
    </>
  )
}
