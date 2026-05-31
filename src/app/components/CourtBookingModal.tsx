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
import { SERVICE_ENDPOINT } from '../constants'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import DownloadIcon from '@mui/icons-material/Download'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatePayload = require('promptpay-qr') as (id: string, options?: { amount?: number }) => string

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
  onBookingComplete,
}: CourtBookingModalProps) {
  const { t } = useTranslation()
  const steps = [t('booking.step2'), t('booking.step3'), t('booking.step4')]
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
  const qrRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [bookingResult, setBookingResult] = useState<{ bookingRef?: string; totalPrice?: number; currency?: string; highlightKey?: string; isGuest?: boolean; bundleID?: string } | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [slipNote, setSlipNote] = useState('')
  const [slipSubmitting, setSlipSubmitting] = useState(false)
  const [slipError, setSlipError] = useState<string | null>(null)
  const [slipSuccess, setSlipSuccess] = useState(false)

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
        setAgreeTerms(false)
        setNote('')
        setBookingType('single')
        setRecurringConflicts([])
        const currency = recurringCourt?.currency ?? 'THB'
        setBookingResult({ totalPrice: recurringTotalPrice, currency })
        setActiveStep(2)
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

      const result = await bookingsService.createBundle({
        items: effectiveItems,
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

      const totalPrice = 'bookings' in result
        ? result.totalPrice
        : result.totalPrice
      const currency = 'bookings' in result
        ? (result.bookings?.[0]?.currency ?? courts[0]?.currency ?? 'THB')
        : (result.currency ?? courts[0]?.currency ?? 'THB')
      const highlightKey = 'bookings' in result
        ? result.bookingBundleID
        : (result.bookingBundleID || `single-${result.id}`)
      const bookingRef = 'bookingRef' in result ? result.bookingRef : undefined
      setBookingResult({
        bookingRef,
        totalPrice,
        currency,
        highlightKey,
        isGuest: !currentUser?.id,
        bundleID: 'bookings' in result ? result.bookingBundleID : result.bookingBundleID,
      })
      setActiveStep(2)
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

  const handleSaveQR = async() => {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const promptPayTotal = Number(bookingResult?.totalPrice ?? 0)
    const payCurrency = bookingResult?.currency ?? 'THB'
    const frameWidth = 320
    const svgSize = 224
    const textAreaHeight = 72

    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const headerImg = new window.Image()
    const qrImg = new window.Image()
    let loaded = 0

    const draw = async() => {
      loaded++
      if (loaded < 2) return

      const scaledHeaderH = Math.round(frameWidth * headerImg.naturalHeight / headerImg.naturalWidth)
      const canvasH = scaledHeaderH + svgSize + textAreaHeight + 24

      const canvas = document.createElement('canvas')
      canvas.width = frameWidth
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // White background frame
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, frameWidth, canvasH)

      // Thai QR payment header
      ctx.drawImage(headerImg, 0, 0, frameWidth, scaledHeaderH)

      // QR code
      const qrX = (frameWidth - svgSize) / 2
      ctx.drawImage(qrImg, qrX, scaledHeaderH + 12, svgSize, svgSize)

      // Amount
      ctx.fillStyle = '#1a237e'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${promptPayTotal.toFixed(2)} ${payCurrency}`, frameWidth / 2, scaledHeaderH + svgSize + 44)

      // Scan label
      ctx.fillStyle = '#666666'
      ctx.font = '13px sans-serif'
      ctx.fillText('สแกนเพื่อชำระเงิน', frameWidth / 2, scaledHeaderH + svgSize + 66)

      URL.revokeObjectURL(svgUrl)

      const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png')
      })
      if (!pngBlob) return

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

      if (isIOS && navigator.share) {
        const qrFile = new File([pngBlob], 'payment-qr.png', { type: 'image/png' })
        const canShareFiles = typeof navigator.canShare === 'function'
          ? navigator.canShare({ files: [qrFile] })
          : false
        if (canShareFiles) {
          try {
            await navigator.share({
              files: [qrFile],
              title: 'PromptPay QR',
              text: 'Save this QR image to Photos',
            })
            return
          } catch {
            // User cancelled or share failed; continue with regular download fallback.
          }
        }
      }

      const a = document.createElement('a')
      a.download = 'payment-qr.png'
      a.href = URL.createObjectURL(pngBlob)
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }

    headerImg.onload = draw
    qrImg.onload = draw
    headerImg.src = '/thai-qr-payment.webp'
    qrImg.src = svgUrl
  }

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setSlipPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setSlipPreview(null)
    }
  }

  const handleSlipSubmit = async() => {
    if (!bookingResult?.bundleID || !slipPreview) return
    try {
      setSlipSubmitting(true)
      setSlipError(null)
      await bookingsService.payBooking(
        bookingResult.bundleID,
        { slip: slipPreview, note: slipNote || undefined },
        bookingResult.isGuest ? guestEmail : undefined,
      )
      setSlipSuccess(true)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message
        setSlipError(msg ?? 'Failed to submit slip. Please try again.')
      } else {
        setSlipError('Failed to submit slip. Please try again.')
      }
    } finally {
      setSlipSubmitting(false)
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
    const isLoggedIn = Boolean(currentUser?.id)
    const bundleID = bookingResult?.bundleID
    const email = guestEmail
    const hasUploadedSlip = slipSuccess

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
    setBookingResult(null)
    setSlipPreview(null)
    setSlipNote('')
    setSlipSubmitting(false)
    setSlipError(null)
    setSlipSuccess(false)
    onClose()

    // Redirect guests to pay page only if they didn't upload slip
    if (!isLoggedIn && !hasUploadedSlip && bundleID && email) {
      router.push(`/pay?bundleID=${bundleID}&email=${encodeURIComponent(email)}`)
    }
  }

  const handleCloseAfterBooking = () => {
    const targetHighlight = bookingResult?.highlightKey
    const isLoggedIn = Boolean(currentUser?.id)
    handleClose()
    if (isLoggedIn) {
      if (targetHighlight) {
        router.push(`/bookings?highlight=${targetHighlight}`)
      } else {
        router.push('/bookings')
      }
    } else {
      onBookingComplete(true)
    }
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

  const isGuestBooking = Boolean(bookingResult?.isGuest)
  const isGuestPaid = isGuestBooking && slipSuccess

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
                    {courts.length > 1 && (
                      <FormControl fullWidth size="small">
                        <InputLabel>{t('booking.court')}</InputLabel>
                        <Select value={recurringCourtID} label={t('booking.court')} onChange={(e) => setRecurringCourtID(e.target.value)}>
                          {courts.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

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
                  {bookingType === 'recurring' ? t('booking.recurringBookingSummary') : t('booking.bookingSummary')}
                </Typography>

                {bookingType === 'recurring' ? (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.venue')}:</strong> {venue.name?.en || venue.name?.th}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.court')}:</strong> {recurringCourt?.name ?? recurringCourtID}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.time')}:</strong> {recurringStartTime} – {recurringEndTime}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.repeat')}:</strong>{' '}
                      {recurringPattern === 'weekly'
                        ? t('booking.weeklyOn', { days: recurringDays.map((d) => DAY_LABELS[d]).join(', ') })
                        : t('booking.everyDayLabel')}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.dateRange')}:</strong> {moment(rangeStart).format('D MMM YYYY')} – {moment(rangeEnd).format('D MMM YYYY')}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('booking.sessions')}:</strong> {recurringDatesPreview.length}
                      {recurringDatesPreview.length > 0 && (
                        <>
                          {' '}· first {Math.min(3, recurringDatesPreview.length)}: {recurringDatesPreview.slice(0, 3).map((d) => moment(d).format('D MMM')).join(', ')}
                          {recurringDatesPreview.length > 3 ? ` +${recurringDatesPreview.length - 3} more` : ''}
                        </>
                      )}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      <strong>{t('booking.estTotal')}:</strong> {recurringTotalPrice.toFixed(2)} {recurringCourt?.currency || 'THB'}
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
                      <strong>{t('booking.venue')}:</strong> {venue.name?.en || venue.name?.th}
                    </Typography>
                    {isItemsPreselected && bookingItems ? (
                      bookingItems.map((item) => {
                        const court = courts.find((c) => c.id === item.courtID)
                        const durationMins = moment(item.endTime, 'HH:mm').diff(moment(item.startTime, 'HH:mm'), 'minutes')
                        const price = court ? getPriceForRange(court, item.startTime, item.endTime) : 0
                        return (
                          <Box key={`${item.courtID}-${item.startTime}`} sx={{ mb: 1, pl: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                            <Typography variant="body2"><strong>{court?.name ?? item.courtID}</strong></Typography>
                            <Typography variant="body2">{t('booking.date')}: {moment(item.date).format('dddd, D MMM')}</Typography>
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
                          <strong>{t('booking.date')}:</strong> {moment(selectedDate).format('dddd, D MMM')}
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

            {activeStep === 2 && (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" color="warning.main" fontWeight={700} sx={{ mb: 0.5 }}>
                    {t('booking.bookingPending')}
                  </Typography>
                  {bookingResult?.bookingRef && (
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 700, letterSpacing: 1 }}>
                      #{bookingResult.bookingRef}
                    </Typography>
                  )}
                  {bookingResult?.totalPrice !== undefined && (
                    <Typography variant="body1" fontWeight={700} sx={{ mt: 1 }}>
                      {t('booking.total')}: {Number(bookingResult.totalPrice).toFixed(2)} {bookingResult.currency}
                    </Typography>
                  )}
                </Box>

                {isGuestPaid ? (
                  <Alert severity="success" sx={{ textAlign: 'left' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      {t('booking.guestSuccessTrackTitle')}
                    </Typography>
                    <Typography variant="body2">
                      {t('booking.guestSuccessTrackDesc')}
                    </Typography>
                  </Alert>
                ) : (
                  <>
                    {venue.payment && (venue.payment.bankName || venue.payment.accountNumber || venue.payment.promptPayID) && (
                      <Box sx={{ mb: 2, textAlign: 'left' }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                          {t('booking.paymentMethod')}
                        </Typography>
                        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box>
                            {venue.payment.bankName && (
                              <Typography variant="body2"><strong>{t('booking.bankName')}:</strong> {venue.payment.bankName}</Typography>
                            )}
                            {venue.payment.accountName && (
                              <Typography variant="body2"><strong>{t('booking.accountName')}:</strong> {venue.payment.accountName}</Typography>
                            )}
                            {venue.payment.accountNumber && (
                              <Typography variant="body2"><strong>{t('booking.accountNumber')}:</strong> {venue.payment.accountNumber}</Typography>
                            )}
                            {venue.payment.promptPayID && (
                              <Typography variant="body2"><strong>{t('booking.promptPayID')}:</strong> {venue.payment.promptPayID}</Typography>
                            )}
                          </Box>
                          {venue.payment.promptPayID && bookingResult?.totalPrice !== undefined && (
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <Box
                                ref={qrRef}
                                sx={{
                                  width: 240,
                                  borderRadius: 3,
                                  overflow: 'hidden',
                                  border: '1.5px solid #e0e0e0',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                }}
                              >
                                <Box
                                  component="img"
                                  src="/thai-qr-payment.webp"
                                  alt="Thai QR Payment"
                                  sx={{ width: '100%', display: 'block' }}
                                />
                                <Box sx={{ bgcolor: '#fff', px: 2, pt: 1.5, pb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                                  <QRCode
                                    value={generatePayload(venue.payment.promptPayID, { amount: Number(bookingResult.totalPrice) })}
                                    size={168}
                                    style={{ display: 'block' }}
                                  />
                                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a237e', letterSpacing: 0.5 }}>
                                    {Number(bookingResult.totalPrice).toFixed(2)}{' '}
                                    <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 400 }}>
                                      {bookingResult.currency}
                                    </Box>
                                  </Typography>
                                  <Typography sx={{ fontSize: '0.65rem', color: '#666', letterSpacing: 0.5, pb: 0.5 }}>
                                    สแกนเพื่อชำระเงิน
                                  </Typography>
                                </Box>
                              </Box>
                              <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleSaveQR}>
                                บันทึก QR
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}

                    <Alert severity="warning" sx={{ textAlign: 'left' }}>
                      {t('booking.uploadSlipWarning')}
                    </Alert>

                    {/* Slip upload section */}
                    {!slipSuccess ? (
                      <Box sx={{ mt: 2, textAlign: 'left' }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                          {t('booking.uploadSlip')}
                        </Typography>
                        <Button
                          variant="contained"
                          component="label"
                          size="small"
                          fullWidth
                          sx={{ mb: 1.5 }}
                        >
                          {slipPreview ? t('booking.fileSelected') : t('booking.chooseFile')}
                          <input type="file" accept="image/*" hidden onChange={handleSlipFileChange} />
                        </Button>
                        {slipPreview && (
                          <Box sx={{ mb: 1.5 }}>
                            <img
                              src={slipPreview}
                              alt="slip preview"
                              style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 4, border: '1px solid #e0e0e0' }}
                            />
                          </Box>
                        )}
                        <TextField
                          size="small"
                          fullWidth
                          label={t('booking.note')}
                          value={slipNote}
                          onChange={(e) => setSlipNote(e.target.value)}
                          multiline
                          rows={2}
                          sx={{ mb: 1.5 }}
                        />
                        {slipError && (
                          <Alert severity="error" sx={{ mb: 1 }}>{slipError}</Alert>
                        )}
                      </Box>
                    ) : (
                      <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>
                        {t('booking.uploadSlipSubmitted')}
                      </Alert>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          {activeStep < 2 && <Button onClick={handleClose}>{t('booking.cancel')}</Button>}
          {activeStep > 0 && activeStep < 2 && (
            <Button onClick={handleBack}>{t('booking.back')}</Button>
          )}
          {activeStep < steps.length - 2 && (
            <Button onClick={handleNext} variant="contained" color="primary">
              {t('booking.next')}
            </Button>
          )}
          {activeStep === steps.length - 2 && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={loading || (bookingType === 'recurring' && recurringDatesPreview.length === 0)}
            >
              {loading ? <CircularProgress size={24} /> : bookingType === 'recurring' ? `Book (${recurringDatesPreview.length} session${recurringDatesPreview.length !== 1 ? 's' : ''})` : t('booking.confirmBooking')}
            </Button>
          )}
          {activeStep === steps.length - 1 && (
            <>
              <Button onClick={handleCloseAfterBooking} color="inherit">
                {t('action.close')}
              </Button>
              {isGuestPaid ? (
                <Button
                  onClick={() => router.push('/register')}
                  variant="contained"
                  sx={{
                    bgcolor: '#80644f',
                    '&:hover': { bgcolor: '#6e5542' },
                  }}
                >
                  {t('booking.createAccount')}
                </Button>
              ) : (
                <Button
                  onClick={handleSlipSubmit}
                  variant="contained"
                  sx={{
                    bgcolor: '#80644f',
                    '&:hover': { bgcolor: '#6e5542' },
                  }}
                  disabled={!bookingResult?.bundleID || !slipPreview || slipSubmitting || slipSuccess}
                >
                  {slipSubmitting ? <CircularProgress size={20} /> : t('booking.uploadSlip')}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      <LoginModal visible={loginModalOpen} setVisible={setLoginModalOpen} />
    </>
  )
}
