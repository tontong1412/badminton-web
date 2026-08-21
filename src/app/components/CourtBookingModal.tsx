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
import playersService from '../services/players'
import { useAppDispatch, useAppSelector } from '../libs/redux/store'
import { addBooking, addBookings, setError } from '../libs/redux/slices/bookingSlice'
import { login } from '../libs/redux/slices/appSlice'
import moment from 'moment'
import axios from 'axios'
import { useRouter } from 'next/navigation'

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

export default function CourtBookingModal({
  open,
  onClose,
  courts,
  venue,
  preselectedSlot,
  bookingItems,
}: CourtBookingModalProps) {
  const { t } = useTranslation()
  const steps = [t('booking.step2'), t('booking.step3')]
  const dispatch = useAppDispatch()
  const router = useRouter()
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
  const errorRef = useRef<HTMLDivElement>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const [bookingType, setBookingType] = useState<'single' | 'recurring'>('single')
  const [recurringCourtIDs, setRecurringCourtIDs] = useState<string[]>([])
  const [recurringStartTime, setRecurringStartTime] = useState('08:00')
  const [recurringEndTime, setRecurringEndTime] = useState('10:00')
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly'>('weekly')
  const [recurringDays, setRecurringDays] = useState<number[]>([1])
  const [rangeStart, setRangeStart] = useState(moment().format('YYYY-MM-DD'))
  const [rangeEnd, setRangeEnd] = useState(moment().add(1, 'month').format('YYYY-MM-DD'))
  const [recurringConflicts, setRecurringConflicts] = useState<{ courtID: string; date: string; reason: string }[]>([])

  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<ValidateCouponResponse | null>(null)
  const [couponValidating, setCouponValidating] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [addOnIDsByCourtSlot, setAddOnIDsByCourtSlot] = useState<Record<string, string[]>>({})

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

  const getActiveAddOnsForCourt = (courtID: string) => {
    const court = courts.find((c) => c.id === courtID)
    return (court?.addOns ?? []).filter((addOn) => addOn.isActive !== false)
  }

  const makeCourtSlotKey = (courtID: string, slotStart: string, slotEnd: string): string => `${courtID}|${slotStart}-${slotEnd}`

  const splitIntoSlots = (windowStart: string, windowEnd: string, slotMinutes = 60): Array<{ startTime: string; endTime: string }> => {
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const fromMins = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const start = toMins(windowStart)
    const end = toMins(windowEnd)
    if (end <= start) return []
    const slots: Array<{ startTime: string; endTime: string }> = []
    for (let cursor = start; cursor < end; cursor += slotMinutes) {
      const slotEnd = Math.min(cursor + slotMinutes, end)
      slots.push({ startTime: fromMins(cursor), endTime: fromMins(slotEnd) })
    }
    return slots
  }

  const getSingleSlotsForCourt = (courtID: string): Array<{ startTime: string; endTime: string }> => {
    if (isItemsPreselected && bookingItems) {
      const matchingItems = bookingItems.filter((item) => item.courtID === courtID)
      const byKey = new Map<string, { startTime: string; endTime: string }>()
      for (const item of matchingItems) {
        for (const slot of splitIntoSlots(item.startTime, item.endTime, 60)) {
          byKey.set(`${slot.startTime}-${slot.endTime}`, slot)
        }
      }
      return Array.from(byKey.values())
    }
    if (!startTime || !endTime) return []
    return splitIntoSlots(startTime, endTime, 60)
  }

  const recurringAddOnSlots = splitIntoSlots(recurringStartTime, recurringEndTime, 60)

  const getSelectedAddOnsForCourtSlot = (courtID: string, slotStart: string, slotEnd: string) => {
    const selectedIDs = addOnIDsByCourtSlot[makeCourtSlotKey(courtID, slotStart, slotEnd)] ?? []
    const activeAddOns = getActiveAddOnsForCourt(courtID)
    return activeAddOns.filter((addOn) => selectedIDs.includes(addOn.id))
  }

  const getAddOnTotalForCourtSlot = (courtID: string, slotStart: string, slotEnd: string) => getSelectedAddOnsForCourtSlot(courtID, slotStart, slotEnd)
    .reduce((sum, addOn) => sum + addOn.price, 0)

  const calculateBasePrice = () => {
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

  const calculateAddOnTotal = () => {
    if (isItemsPreselected && bookingItems) {
      return bookingItems.reduce((sum, item) => (
        sum + splitIntoSlots(item.startTime, item.endTime, 60)
          .reduce((slotSum, slot) => slotSum + getAddOnTotalForCourtSlot(item.courtID, slot.startTime, slot.endTime), 0)
      ), 0)
    }
    return courts.reduce((sum, court) => (
      sum + getSingleSlotsForCourt(court.id)
        .reduce((slotSum, slot) => slotSum + getAddOnTotalForCourtSlot(court.id, slot.startTime, slot.endTime), 0)
    ), 0)
  }

  const calculatePrice = () => Number((calculateBasePrice() + calculateAddOnTotal()).toFixed(2))

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

  const selectedRecurringCourts = courts.filter((c) => recurringCourtIDs.includes(c.id))
  const recurringCurrency = selectedRecurringCourts[0]?.currency ?? courts[0]?.currency ?? 'THB'
  const recurringBasePricePerSession = selectedRecurringCourts.reduce((sum, court) => {
    return sum + getPriceForRange(court, recurringStartTime, recurringEndTime)
  }, 0)
  const recurringAddOnPerSession = selectedRecurringCourts.reduce((sum, court) => (
    sum + recurringAddOnSlots.reduce((slotSum, slot) => (
      slotSum + getAddOnTotalForCourtSlot(court.id, slot.startTime, slot.endTime)
    ), 0)
  ), 0)
  const recurringPricePerSession = recurringBasePricePerSession + recurringAddOnPerSession
  const recurringDatesPreview = calcRecurringDates()
  const recurringTotalPrice = recurringPricePerSession * recurringDatesPreview.length

  const getCourtNameByID = (courtID: string): string => {
    return courts.find((court) => court.id === courtID)?.name ?? courtID
  }

  const singleAddOnCourtIDs = isItemsPreselected && bookingItems
    ? Array.from(new Set(bookingItems.map((item) => item.courtID)))
    : courts.map((court) => court.id)

  const handleNext = () => {
    if (activeStep === 0) {
      if (currentUser) {
        const profilePhone = currentUser.player.contact?.tel?.trim()
        if (!profilePhone && !userPhone.trim()) {
          setErrorState('Please enter your phone number so the venue can contact you.')
          return
        }
      } else if (!guestName || !guestPhone || !guestEmail) {
        setGuestFieldErrors({ name: !guestName, phone: !guestPhone, email: !guestEmail })
        setErrorState(t('booking.fillRequiredFields'))
        return
      }
      if (bookingType === 'recurring') {
        if (recurringCourtIDs.length === 0) { setErrorState(t('booking.selectAtLeastOneCourt')); return }
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

  const resetModalState = () => {
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
    setRecurringCourtIDs(courts[0]?.id ? [courts[0].id] : [])
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
    setAddOnIDsByCourtSlot({})
  }

  const navigateAfterBooking = (bundleID: string, email?: string) => {
    resetModalState()
    onClose()

    if (email) {
      router.push(`/pay?bundleID=${bundleID}&email=${encodeURIComponent(email)}`)
      return
    }
    router.push(`/pay?bundleID=${bundleID}`)
  }

  const handleSubmit = async() => {
    if (!agreeTerms) {
      setTermsError(true)
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (bookingType === 'recurring') {
      const selectedCourtIDs = Array.from(new Set(recurringCourtIDs.filter((courtID) => courtID.trim().length > 0)))
      const primaryCourtID = selectedCourtIDs[0]
      if (!primaryCourtID) {
        setErrorState(t('booking.selectAtLeastOneCourt'))
        return
      }

      try {
        setLoading(true)
        setRecurringConflicts([])
        const response = await bookingsService.createRecurring({
          // Keep compatibility with both API shapes across branches.
          courtID: primaryCourtID,
          courtIDs: selectedCourtIDs,
          addOnIDsByCourtAndSlot: Object.fromEntries(
            selectedCourtIDs.map((courtID) => {
              const slotMap = Object.fromEntries(
                recurringAddOnSlots
                  .map((slot) => {
                    const ids = addOnIDsByCourtSlot[makeCourtSlotKey(courtID, slot.startTime, slot.endTime)] ?? []
                    return [`${slot.startTime}-${slot.endTime}`, ids] as const
                  })
                  .filter(([, ids]) => ids.length > 0)
              )
              return [courtID, slotMap] as const
            }).filter(([, slotMap]) => Object.keys(slotMap).length > 0)
          ),
          startTime: recurringStartTime,
          endTime: recurringEndTime,
          pattern: recurringPattern,
          rangeStart,
          rangeEnd,
          daysOfWeek: recurringPattern === 'weekly' ? recurringDays : undefined,
          note: note || undefined,
        })
        setErrorState(null)
        const recurringResponse = response as {
          bookingBundleID?: unknown;
          bookings?: Array<{ bookingBundleID?: string }>;
        } | undefined
        const recurringBundleID = typeof recurringResponse?.bookingBundleID === 'string'
          ? recurringResponse.bookingBundleID
          : recurringResponse?.bookings?.[0]?.bookingBundleID
        if (!recurringBundleID) {
          setErrorState('Could not determine payment bundle. Please contact support.')
          return
        }
        navigateAfterBooking(recurringBundleID)
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as {
            message?: string;
            conflicts?: { courtID?: string; date: string; reason: string }[];
            missingCourtIDs?: string[];
            inactiveCourtIDs?: string[];
          }
          if (err.response?.status === 409 && data?.conflicts) {
            setRecurringConflicts(data.conflicts.map((conflict) => ({
              courtID: conflict.courtID ?? primaryCourtID,
              date: conflict.date,
              reason: conflict.reason,
            })))
            setErrorState(t('booking.recurringConflictsFound', { count: data.conflicts.length }))
          } else {
            const diagnostics: string[] = []
            if (Array.isArray(data?.missingCourtIDs) && data.missingCourtIDs.length > 0) {
              diagnostics.push(`missing: ${data.missingCourtIDs.join(', ')}`)
            }
            if (Array.isArray(data?.inactiveCourtIDs) && data.inactiveCourtIDs.length > 0) {
              diagnostics.push(`inactive: ${data.inactiveCourtIDs.join(', ')}`)
            }
            const diagnosticText = diagnostics.length > 0 ? ` (${diagnostics.join(' | ')})` : ''
            setErrorState(`${data?.message ?? 'Failed to create recurring booking.'}${diagnosticText}`)
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
    if (bookingStartAt.isBefore(moment().startOf('hour'))) {
      setErrorState(t('booking.pastTimeNotAllowed'))
      return
    }

    try {
      setLoading(true)

      const enteredUserPhone = userPhone.trim()
      const profilePhone = currentUser?.player.contact?.tel?.trim()

      if (currentUser?.id && !profilePhone && enteredUserPhone) {
        try {
          const updatedPlayer = await playersService.updateMe(currentUser.player.id, {
            contact: {
              line: currentUser.player.contact?.line ?? '',
              tel: enteredUserPhone,
            },
          })
          dispatch(login({
            ...currentUser,
            player: {
              ...currentUser.player,
              contact: {
                line: updatedPlayer.contact?.line ?? currentUser.player.contact?.line ?? '',
                tel: updatedPlayer.contact?.tel ?? enteredUserPhone,
              },
            },
          }))
        } catch (savePhoneError: unknown) {
          if (axios.isAxiosError(savePhoneError)) {
            const msg = (savePhoneError.response?.data as { message?: string } | undefined)?.message
            setErrorState(msg ?? 'Failed to save your phone number. Please try again.')
          } else {
            setErrorState('Failed to save your phone number. Please try again.')
          }
          return
        }
      }

      const bookingPhone = currentUser?.id ? (enteredUserPhone || profilePhone) : undefined

      const effectiveItems = isItemsPreselected && bookingItems
        ? bookingItems
        : courts.map((court) => ({
          courtID: court.id,
          date: selectedDate,
          startTime,
          endTime,
        }))

      const effectiveItemsWithAddOns = effectiveItems.map((item) => ({
        ...item,
        addOnIDsBySlot: Object.fromEntries(
          splitIntoSlots(item.startTime, item.endTime, 60)
            .map((slot) => {
              const ids = addOnIDsByCourtSlot[makeCourtSlotKey(item.courtID, slot.startTime, slot.endTime)] ?? []
              return [`${slot.startTime}-${slot.endTime}`, ids] as const
            })
            .filter(([, ids]) => ids.length > 0)
        ),
      }))

      const result = await bookingsService.createBundle({
        items: effectiveItemsWithAddOns,
        ...(!currentUser?.id && {
          guestName,
          guestPhone,
          guestEmail,
        }),
        ...(currentUser?.id && bookingPhone && {
          guestPhone: bookingPhone,
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

      const isGuest = !currentUser?.id
      const email = isGuest ? guestEmail : undefined
      const bundleID = result.bookingBundleID
      if (!bundleID) {
        setErrorState('Could not determine payment bundle. Please contact support.')
        return
      }
      navigateAfterBooking(bundleID, email)
    } catch (err) {
      let message = 'Booking failed. Please try again.'
      if (axios.isAxiosError(err)) {
        message = (err.response?.data as { message?: string } | undefined)?.message ?? message
      } else if (err instanceof Error) {
        message = err.message
      }
      setErrorState(message)
      dispatch(setError(message))
      console.error('Booking error:', err)
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
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

  const handleToggleAddOn = (courtID: string, slotStart: string, slotEnd: string, addOnID: string) => {
    const slotKey = makeCourtSlotKey(courtID, slotStart, slotEnd)
    setAddOnIDsByCourtSlot((prev) => {
      const current = new Set(prev[slotKey] ?? [])
      if (current.has(addOnID)) current.delete(addOnID)
      else current.add(addOnID)
      return {
        ...prev,
        [slotKey]: Array.from(current),
      }
    })
    setCouponResult(null)
    setCouponError(null)
  }

  const handleClose = () => {
    resetModalState()
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
    if (seedCourtID) setRecurringCourtIDs([seedCourtID])
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
              <Alert ref={errorRef} severity="error" sx={{ mb: 2 }}>
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
                      <ToggleButton value="single">{t('booking.oneTime')}</ToggleButton>
                      <ToggleButton value="recurring">{t('booking.recurring')}</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}

                {currentUser ? (
                  <Box sx={{ mb: 2, p: 2, bgcolor: '#f5efe8', borderRadius: 1.5, border: '1px solid #e8d8c8' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#80644f' }}>
                      {t('booking.bookingAs')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{t('booking.name')}:</strong> {currentUser.player.displayName?.en || currentUser.player.displayName?.th || currentUser.player.officialName?.en || currentUser.player.officialName?.th || '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{t('booking.email')}:</strong> {currentUser.email}
                    </Typography>
                    {currentUser.player.contact?.tel ? (
                      <Typography variant="body2">
                        <strong>{t('booking.phone')}:</strong> {currentUser.player.contact.tel}
                      </Typography>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        label={t('booking.phoneNumber')}
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        sx={{ mt: 1.5 }}
                        required
                        helperText={t('booking.phoneRequired')}
                      />
                    )}
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5efe8', borderRadius: 1.5, border: '1px solid #e8d8c8', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 160 }}>
                        {t('booking.haveAccount')}
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => setLoginModalOpen(true)} sx={{ borderColor: '#80644f', color: '#80644f', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {t('action.login')}
                      </Button>
                      <Button size="small" href="/register" sx={{ color: '#80644f', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {t('action.register')}
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">{t('booking.continueAsGuest')}</Typography></Divider>
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
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('booking.courts')}</InputLabel>
                      <Select
                        multiple
                        value={recurringCourtIDs}
                        label={t('booking.courts')}
                        onChange={(e) => {
                          const value = e.target.value
                          const nextCourtIDs = (typeof value === 'string' ? value.split(',') : value)
                            .map((courtID) => courtID.trim())
                            .filter((courtID) => courtID.length > 0)
                          setRecurringCourtIDs(Array.from(new Set(nextCourtIDs)))
                        }}
                        renderValue={(selected) => {
                          const selectedIDs = selected as string[]
                          return selectedIDs.map((courtID) => getCourtNameByID(courtID)).join(', ')
                        }}
                      >
                        {courts.map((c) => {
                          const checked = recurringCourtIDs.includes(c.id)
                          return (
                            <MenuItem key={c.id} value={c.id}>
                              <Checkbox size="small" checked={checked} />
                              {c.name}
                            </MenuItem>
                          )
                        })}
                      </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>{t('booking.startTime')}</InputLabel>
                        <Select value={recurringStartTime} label={t('booking.startTime')} onChange={(e) => setRecurringStartTime(e.target.value)}>
                          {Array.from({ length: 48 }, (_, i) => {
                            const h = Math.floor(i / 2).toString().padStart(2, '0')
                            const m = i % 2 === 0 ? '00' : '30'
                            const val = `${h}:${m}`
                            return <MenuItem key={val} value={val}>{val}</MenuItem>
                          })}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>{t('booking.endTime')}</InputLabel>
                        <Select value={recurringEndTime} label={t('booking.endTime')} onChange={(e) => setRecurringEndTime(e.target.value)}>
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
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{t('booking.repeat')}</Typography>
                      <ToggleButtonGroup
                        value={recurringPattern}
                        exclusive
                        onChange={(_, v) => { if (v) setRecurringPattern(v) }}
                        size="small"
                      >
                        <ToggleButton value="weekly">{t('booking.weekly')}</ToggleButton>
                        <ToggleButton value="daily">{t('booking.everyDay')}</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    {recurringPattern === 'weekly' && (
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{t('booking.days')}</Typography>
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
                        label={t('booking.from')}
                        type="date"
                        size="small"
                        fullWidth
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        inputProps={{ min: moment().format('YYYY-MM-DD') }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label={t('booking.to')}
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
                        helperText={!isAdmin ? t('booking.maxTwoMonths') : undefined}
                      />
                    </Box>

                    {recurringDatesPreview.length > 0 && (
                      <Box sx={{ bgcolor: '#faf7f5', borderRadius: 1, p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {recurringDatesPreview.length} session{recurringDatesPreview.length !== 1 ? 's' : ''} · first {Math.min(5, recurringDatesPreview.length)}:{' '}
                          {recurringDatesPreview.slice(0, 5).map((d) => moment(d).format('D MMM')).join(', ')}
                          {recurringDatesPreview.length > 5 ? ` +${recurringDatesPreview.length - 5} more` : ''}
                        </Typography>
                        {selectedRecurringCourts.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {t('booking.recurringEstimateLine', {
                              total: recurringTotalPrice.toFixed(2),
                              perSession: recurringPricePerSession.toFixed(2),
                              currency: recurringCurrency,
                              count: selectedRecurringCourts.length,
                            })}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {(
                  bookingType === 'recurring'
                    ? selectedRecurringCourts.some((court) => getActiveAddOnsForCourt(court.id).length > 0)
                    : singleAddOnCourtIDs.some((courtID) => getActiveAddOnsForCourt(courtID).length > 0)
                ) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.2 }}>{t('booking.addOns') || 'Add-ons'}</Typography>
                    {(bookingType === 'recurring' ? selectedRecurringCourts : singleAddOnCourtIDs.map((courtID) => courts.find((c) => c.id === courtID)).filter(Boolean)).map((court) => {
                      const resolvedCourt = court as Court
                      const activeAddOns = getActiveAddOnsForCourt(resolvedCourt.id)
                      const slots = bookingType === 'recurring' ? recurringAddOnSlots : getSingleSlotsForCourt(resolvedCourt.id)
                      if (activeAddOns.length === 0) return null
                      return (
                        <Box key={resolvedCourt.id} sx={{ mb: 1.5, p: 1.2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.8 }}>{resolvedCourt.name}</Typography>
                          {slots.map((slot) => (
                            <Box key={`${resolvedCourt.id}-${slot.startTime}-${slot.endTime}`} sx={{ mb: 0.8, pl: 0.2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2 }}>
                                {slot.startTime} - {slot.endTime}
                              </Typography>
                              {activeAddOns.map((addOn) => {
                                const checked = (addOnIDsByCourtSlot[makeCourtSlotKey(resolvedCourt.id, slot.startTime, slot.endTime)] ?? []).includes(addOn.id)
                                return (
                                  <Box
                                    key={`${addOn.id}-${slot.startTime}-${slot.endTime}`}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      mb: 0.2,
                                    }}
                                  >
                                    <Checkbox
                                      size="small"
                                      checked={checked}
                                      onChange={() => handleToggleAddOn(resolvedCourt.id, slot.startTime, slot.endTime, addOn.id)}
                                      sx={{ p: 0.5, mr: 1, mb: 0 }}
                                    />
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {addOn.name} · {addOn.price.toFixed(2)} {resolvedCourt.currency}
                                      </Typography>
                                      {addOn.details && (
                                        <Typography variant="caption" color="text.secondary">{addOn.details}</Typography>
                                      )}
                                    </Box>
                                  </Box>
                                )
                              })}
                            </Box>
                          ))}
                        </Box>
                      )
                    })}
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
                  {bookingType === 'recurring' ? t('booking.recurringBookingSummary') : t('booking.bookingSummary')}
                </Typography>

                {bookingType === 'recurring' ? (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>{t('booking.venue')}:</strong> <strong>{venue.name?.en || venue.name?.th}</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>{t('booking.courts')}:</strong> {selectedRecurringCourts.map((court) => court.name).join(', ') || '—'}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>{t('booking.time')}:</strong> <strong>{recurringStartTime} – {recurringEndTime}</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>{t('booking.repeat')}:</strong>{' '}
                      {recurringPattern === 'weekly'
                        ? t('booking.weeklyOn', { days: recurringDays.map((d) => DAY_LABELS[d]).join(', ') })
                        : t('booking.everyDayLabel')}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>{t('booking.dateRange')}:</strong> <strong>{moment(rangeStart).format('D MMM YYYY')} – {moment(rangeEnd).format('D MMM YYYY')}</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>{t('booking.sessions')}:</strong> {recurringDatesPreview.length}
                      {recurringDatesPreview.length > 0 && (
                        <>
                          {' '}· first {Math.min(3, recurringDatesPreview.length)}: {recurringDatesPreview.slice(0, 3).map((d) => moment(d).format('D MMM')).join(', ')}
                          {recurringDatesPreview.length > 3 ? ` +${recurringDatesPreview.length - 3} more` : ''}
                        </>
                      )}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      <strong>{t('booking.estTotal')}:</strong> {recurringTotalPrice.toFixed(2)} {recurringCurrency}
                    </Typography>
                    {recurringAddOnPerSession > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body1">
                          <strong>{t('booking.addOns') || 'Add-ons'}:</strong> +{recurringAddOnPerSession.toFixed(2)} {recurringCurrency} / session
                        </Typography>
                      </Box>
                    )}
                    {recurringConflicts.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                        {recurringConflicts.map((c) => (
                          <Chip
                            key={`${c.courtID}-${c.date}-${c.reason}`}
                            label={`${getCourtNameByID(c.courtID)} · ${moment(c.date).format('D MMM')} – ${c.reason}`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ mb: 2, p: 0, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>{t('booking.venue')}:</strong> <strong>{venue.name?.en || venue.name?.th}</strong>
                    </Typography>
                    {isItemsPreselected && bookingItems ? (
                      bookingItems.map((item) => {
                        const court = courts.find((c) => c.id === item.courtID)
                        const durationMins = moment(item.endTime, 'HH:mm').diff(moment(item.startTime, 'HH:mm'), 'minutes')
                        const basePrice = court ? getPriceForRange(court, item.startTime, item.endTime) : 0
                        const addOnTotal = splitIntoSlots(item.startTime, item.endTime, 60)
                          .reduce((sum, slot) => sum + getAddOnTotalForCourtSlot(item.courtID, slot.startTime, slot.endTime), 0)
                        const slotPriceWithAddOns = basePrice + addOnTotal
                        return (
                          <Box key={`${item.courtID}-${item.startTime}`} sx={{ mb: 1, pl: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                            <Typography variant="body1"><strong>{court?.name ?? item.courtID}</strong></Typography>
                            <Typography variant="body1">{t('booking.date')}: <strong>{moment(item.date).format('dddd, D MMM')}</strong></Typography>
                            <Typography variant="body1">{t('booking.time')}: <strong>{item.startTime} – {item.endTime} ({durationMins} {t('booking.minutes')})</strong></Typography>
                            {splitIntoSlots(item.startTime, item.endTime, 60).map((slot) => {
                              const slotAddOns = getSelectedAddOnsForCourtSlot(item.courtID, slot.startTime, slot.endTime)
                              if (slotAddOns.length === 0) return null
                              return (
                                <Box key={`${item.courtID}-${item.date}-${slot.startTime}-${slot.endTime}`} sx={{ pl: 0.8, mt: 0.3 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>
                                    {slot.startTime} - {slot.endTime}
                                  </Typography>
                                  {slotAddOns.map((addOn) => (
                                    <Typography key={`${item.courtID}-${slot.startTime}-${slot.endTime}-${addOn.id}`} variant="body2" color="text.secondary" sx={{ display: 'block', pl: 0.8 }}>
                                      {addOn.name} (+{addOn.price.toFixed(2)} {court?.currency || 'THB'})
                                    </Typography>
                                  ))}
                                </Box>
                              )
                            })}
                            <Typography variant="body1">
                              {t('booking.price')}: <strong>{slotPriceWithAddOns.toFixed(2)} {court?.currency || 'THB'}</strong>
                            </Typography>
                          </Box>
                        )
                      })
                    ) : (
                      <>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>{t('booking.courts')}:</strong> {courts.map((court) => court.name).join(', ')}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>{t('booking.date')}:</strong> <strong>{moment(selectedDate).format('dddd, D MMM')}</strong>
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>{t('booking.time')}:</strong> <strong>{startTime} - {endTime}</strong>
                        </Typography>
                        {courts.map((court) => {
                          const slotAddOns = (!startTime || !endTime) ? [] : getSelectedAddOnsForCourtSlot(court.id, startTime, endTime)
                          if (slotAddOns.length === 0) return null
                          return (
                            <Box key={`${court.id}-${startTime}-${endTime}`} sx={{ pl: 0.8, mb: 0.6 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>
                                {court.name} · {startTime} - {endTime}
                              </Typography>
                              {slotAddOns.map((addOn) => (
                                <Typography key={`${court.id}-${startTime}-${endTime}-${addOn.id}`} variant="body2" color="text.secondary" sx={{ display: 'block', pl: 0.8 }}>
                                  {addOn.name} (+{addOn.price.toFixed(2)} {court.currency})
                                </Typography>
                              ))}
                            </Box>
                          )
                        })}
                        <Typography variant="body1" sx={{ mb: 1 }}>
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
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('booking.discountCoupon')}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label={t('booking.couponCode')}
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase())
                          setCouponResult(null)
                          setCouponError(null)
                        }}
                        placeholder={t('booking.enterCode')}
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
                          {t('booking.remove')}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || couponValidating}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {couponValidating ? <CircularProgress size={16} /> : t('booking.apply')}
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
                    <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>{t('booking.termsAndConditions')}</Typography>
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
                  label={venue.termsAndConditions && (venue.termsAndConditions.th || venue.termsAndConditions.en) ? t('booking.agreeTermsAndConditions') : t('booking.agreeTerms')}
                />
                {termsError && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 4 }}>
                    {t('booking.termsRequired')}
                  </Typography>
                )}
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  {t('booking.uploadSlipWarning')}
                </Alert>
              </Box>
            )}

          </Box>
        </DialogContent>

        <DialogActions>
          {activeStep < 2 && <Button onClick={handleClose}>{t('booking.cancel')}</Button>}
          {activeStep > 0 && activeStep < 2 && (
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
