'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Booking, BookingResaleOutcome, BookingStatus, Court, PaymentStatus, Venue } from '@/type'
import bookingsService from '../services/bookings'
import resaleService from '../services/resale'
import playersService from '../services/players'
import courtsService from '../services/courts'
import venueService from '../services/venues'
import { useMyBookings, useMyPlayer } from '../libs/data'
import { useAppDispatch, useAppSelector } from '../libs/redux/store'
import { setBookings, removeBooking } from '../libs/redux/slices/bookingSlice'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import { Download } from '@mui/icons-material'
import Layout from '../components/Layout'
import axios from 'axios'
import QRCode from 'react-qr-code'
import generatePayload from 'promptpay-qr'
import { useRouter } from 'next/navigation'

const EXPIRY_MINUTES = 10

function BookingCountdown({ createdAt }: { createdAt: string }) {
  const expiresAt = useMemo(() => new Date(createdAt).getTime() + EXPIRY_MINUTES * 60 * 1000, [createdAt])
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setRemaining(secs)
      if (secs === 0 && timerRef.current) clearInterval(timerRef.current)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [expiresAt])

  if (remaining <= 0) {
    return (
      <Typography variant="caption" color="error" sx={{ display: 'block', fontWeight: 600, mt: 0.5 }}>
        Expired — awaiting cancellation
      </Typography>
    )
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isUrgent = remaining < 120

  return (
    <Typography
      variant="caption"
      sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: isUrgent ? 'error.main' : 'warning.main' }}
    >
      Pay within {mins}:{String(secs).padStart(2, '0')} min or booking will be cancelled
    </Typography>
  )
}

export default function MyBookingsPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const router = useRouter()
  const user = useAppSelector((state) => state.app.user)
  const userReady = useAppSelector((state) => state.app.userReady)

  useEffect(() => {
    if (userReady && !user) router.replace('/')
  }, [userReady, user, router])

  const { bookings, isLoading: loading, mutate: mutateBookings } = useMyBookings()
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [venueDetails, setVenueDetails] = useState<Record<string, Venue>>({})
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [payingBundleID, setPayingBundleID] = useState<string | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payTargetBundleID, setPayTargetBundleID] = useState<string | null>(null)
  const [payTargetBookings, setPayTargetBookings] = useState<Booking[]>([])
  const [payTargetCurrency, setPayTargetCurrency] = useState<string>('THB')
  const [payTargetVenue, setPayTargetVenue] = useState<Venue | null>(null)
  const [isResalePay, setIsResalePay] = useState(false)
  const qrFrameRef = useRef<HTMLDivElement>(null)

  const handleSaveQR = () => {
    if (!qrFrameRef.current || (!payTargetVenue && !isResalePay)) return
    const svg = qrFrameRef.current.querySelector('svg')
    if (!svg) return

    const promptPayTotal = payTargetBookings.reduce((sum, b) => sum + (parseFloat(String(b.totalPrice)) || 0), 0)
    const frameWidth = 320
    const svgSize = 224
    const textAreaHeight = 72

    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const headerImg = new window.Image()
    const qrImg = new window.Image()
    let loaded = 0

    const draw = () => {
      loaded++
      if (loaded < 2) return

      const scaledHeaderH = Math.round(frameWidth * headerImg.naturalHeight / headerImg.naturalWidth)
      const canvasH = scaledHeaderH + svgSize + textAreaHeight + 24

      const canvas = document.createElement('canvas')
      canvas.width = frameWidth
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')!

      // White bg
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, frameWidth, canvasH)

      // Header image
      ctx.drawImage(headerImg, 0, 0, frameWidth, scaledHeaderH)

      // QR code
      const qrX = (frameWidth - svgSize) / 2
      ctx.drawImage(qrImg, qrX, scaledHeaderH + 12, svgSize, svgSize)

      // Amount
      ctx.fillStyle = '#1a237e'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${promptPayTotal.toFixed(2)} ${payTargetCurrency}`, frameWidth / 2, scaledHeaderH + svgSize + 44)

      // Scan label
      ctx.fillStyle = '#666666'
      ctx.font = '13px sans-serif'
      ctx.fillText('สแกนเพื่อชำระเงิน', frameWidth / 2, scaledHeaderH + svgSize + 66)

      URL.revokeObjectURL(svgUrl)

      const saveCanvas = () => {
        const link = document.createElement('a')
        link.download = 'payment-qr.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      saveCanvas()
    }

    headerImg.onload = draw
    qrImg.onload = draw
    headerImg.src = '/thai-qr-payment.webp'
    qrImg.src = svgUrl
  }
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [slipNote, setSlipNote] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'past' | 'cancelled'>('active')
  const [resellDialogOpen, setResellDialogOpen] = useState(false)
  const [resellBooking, setResellBooking] = useState<Booking | null>(null)
  const [resellPrice, setResellPrice] = useState('')
  const [resellSubmitting, setResellSubmitting] = useState(false)
  const [resellError, setResellError] = useState<string | null>(null)
  const [payInfoBankName, setPayInfoBankName] = useState('')
  const [payInfoAccountName, setPayInfoAccountName] = useState('')
  const [payInfoAccountNumber, setPayInfoAccountNumber] = useState('')
  const [payInfoPromptPay, setPayInfoPromptPay] = useState('')
  // per-slot config for multi-hour bookings: key = "startTime|endTime"
  const [resellSlotConfig, setResellSlotConfig] = useState<Record<string, { selected: boolean; price: string; bookingID?: string }>>({})

  const { player: myPlayer, mutate: mutateMyPlayer } = useMyPlayer(!!user)

  const groupedBookings = useMemo(() => {
    const groupedMap = new Map<string, Booking[]>()

    bookings.forEach((booking) => {
      const key = booking.bookingBundleID || `single-${booking.id}`
      const existing = groupedMap.get(key) || []
      existing.push(booking)
      groupedMap.set(key, existing)
    })

    const grouped = Array.from(groupedMap.entries()).map(([groupKey, groupedItems]) => {
      const sortedItems = [...groupedItems].sort((a, b) => {
        const aDate = moment(`${a.date} ${a.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
        const bDate = moment(`${b.date} ${b.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
        return aDate - bDate
      })

      const first = sortedItems[0]
      const nonCancelledItems = sortedItems.filter((item) => item.status !== 'cancelled')
      const firstNonCancelled = nonCancelledItems[0] ?? first
      const totalPrice = nonCancelledItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
      const allCancelled = sortedItems.every((item) => item.status === 'cancelled')
      const allConfirmed = nonCancelledItems.length > 0 && nonCancelledItems.every((item) => item.status === 'confirmed')
      const allPaid = nonCancelledItems.every((item) => item.paymentStatus === 'paid')
      const anyUnpaid = nonCancelledItems.some((item) => item.paymentStatus === 'unpaid')

      return {
        groupKey,
        bundleID: first.bookingBundleID,
        bookingRef: first.bookingRef,
        bookings: sortedItems,
        date: firstNonCancelled.date,
        startTime: firstNonCancelled.startTime,
        endTime: firstNonCancelled.endTime,
        currency: first.currency,
        totalPrice,
        status: allCancelled ? 'cancelled' : (allConfirmed ? 'confirmed' : 'pending'),
        paymentStatus: allPaid ? 'paid' : (anyUnpaid ? 'unpaid' : 'pending'),
      }
    })

    return grouped.sort((a, b) => {
      const aDate = moment(`${a.date} ${a.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
      const bDate = moment(`${b.date} ${b.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
      return bDate - aDate
    })
  }, [bookings])

  const activeBookings = useMemo(
    () => groupedBookings.filter((g) => {
      if (g.status === 'cancelled') return false
      const nonCancelledBookings = g.bookings.filter((b) => b.status !== 'cancelled')
      const lastBooking = nonCancelledBookings[nonCancelledBookings.length - 1] ?? g.bookings[g.bookings.length - 1]
      return moment(`${lastBooking.date} ${lastBooking.endTime}`, 'YYYY-MM-DD HH:mm').isAfter(moment())
    }),
    [groupedBookings],
  )
  const pastBookings = useMemo(
    () => groupedBookings.filter((g) => {
      if (g.status === 'cancelled') return false
      const nonCancelledBookings = g.bookings.filter((b) => b.status !== 'cancelled')
      const lastBooking = nonCancelledBookings[nonCancelledBookings.length - 1] ?? g.bookings[g.bookings.length - 1]
      return moment(`${lastBooking.date} ${lastBooking.endTime}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())
    }),
    [groupedBookings],
  )
  const cancelledBookings = useMemo(
    () => groupedBookings.filter((g) => g.status === 'cancelled'),
    [groupedBookings],
  )
  const displayedBookings = activeTab === 'cancelled' ? cancelledBookings : activeTab === 'past' ? pastBookings : activeBookings

  // Sync bookings into redux + load court/venue details whenever SWR data changes
  useEffect(() => {
    if (!bookings.length) return
    dispatch(setBookings(bookings))
    const load = async() => {
      const courtIds = [...new Set(bookings.map((b) => b.courtID))]
      const courts: Record<string, Court> = {}
      const venues: Record<string, Venue> = {}
      for (const courtId of courtIds) {
        try {
          const court = await courtsService.getById(courtId)
          courts[courtId] = court
          if (!venues[court.venueID]) {
            const venue = await venueService.getById(court.venueID)
            venues[court.venueID] = venue
          }
        } catch (err) {
          console.error(`Failed to load court ${courtId}:`, err)
        }
      }
      setCourtDetails(courts)
      setVenueDetails(venues)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCancelClick = (bookingIds: string[]) => {
    setSelectedBookingIds(bookingIds)
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async() => {
    if (selectedBookingIds.length === 0) return

    try {
      setCancelling(true)
      await Promise.all(selectedBookingIds.map((bookingId) => bookingsService.cancel(bookingId)))

      mutateBookings()
      selectedBookingIds.forEach((bookingId) => dispatch(removeBooking(bookingId)))

      setCancelDialogOpen(false)
      setSelectedBookingIds([])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel booking'
      setError(message)
      console.error('Error canceling booking:', err)
    } finally {
      setCancelling(false)
    }
  }

  const handlePayBundle = async(bundleID: string, bookingIds: string[], currency: string) => {
    const bundleBookings = bookings.filter((b) => bookingIds.includes(b.id))
    const firstCourtID = bundleBookings[0]?.courtID
    const court = firstCourtID ? courtDetails[firstCourtID] : undefined
    const venue = court ? venueDetails[court.venueID] : undefined
    setPayTargetBundleID(bundleID)
    setPayTargetBookings(bundleBookings)
    setPayTargetCurrency(currency)
    setPayTargetVenue(venue ?? null)
    setIsResalePay(bundleBookings.some((b) => !!b.resaleSourceListingID))
    setSlipFile(null)
    setSlipPreview(null)
    setSlipNote('')
    setPayError(null)
    setPayDialogOpen(true)
  }

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSlipFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setSlipPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setSlipPreview(null)
    }
  }

  const handleConfirmPay = async() => {
    if (!payTargetBundleID || !slipPreview) return
    try {
      setPaySubmitting(true)
      setPayError(null)
      await bookingsService.payBooking(payTargetBundleID, { slip: slipPreview, note: slipNote || undefined })
      setPayDialogOpen(false)
      mutateBookings()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message
        setPayError(msg ?? 'Failed to verify payment slip. Please try again.')
      } else {
        setPayError(err instanceof Error ? err.message : 'Failed to pay booking')
      }
    } finally {
      setPaySubmitting(false)
      setPayingBundleID(null)
    }
  }

  const isResellEligible = (booking: Booking) => {
    if (booking.status !== BookingStatus.Confirmed) return false
    if (booking.paymentStatus !== PaymentStatus.Paid) return false
    if (booking.resaleOutcome && booking.resaleOutcome !== BookingResaleOutcome.None) return false
    if (!moment(`${booking.date} ${booking.startTime}`, 'YYYY-MM-DD HH:mm').isAfter(moment())) return false
    // All hours already sold?
    const soldRanges = booking.resaleSoldRanges ?? []
    if (soldRanges.length > 0 && soldRanges.length * 60 >= booking.durationMinutes) return false
    return true
  }

  // Returns the sub-range that is listed for resale (if the listing was a partial hour slot)
  const getListedSubRange = (booking: Booking): { startTime: string; endTime: string } | null => {
    const listing = booking.resaleListingID
    if (listing && typeof listing === 'object' && listing.subStartTime && listing.subEndTime) {
      return { startTime: listing.subStartTime, endTime: listing.subEndTime }
    }
    return null
  }

  const getListingId = (booking: Booking): string | null => {
    const l = booking.resaleListingID
    if (!l) return null
    return typeof l === 'object' ? l.id : l
  }

  const handleCancelListing = async(booking: Booking) => {
    const listingId = getListingId(booking)
    if (!listingId) return
    try {
      await resaleService.cancel(listingId)
      mutateBookings()
    } catch {
      // silently ignore; the listing may already be gone
    }
  }

  // Split a booking into 1-hour slots for display
  const getHourSlots = (startTime: string, endTime: string) => {
    const slots: { startTime: string; endTime: string }[] = []
    let cursor = moment(startTime, 'HH:mm')
    const end = moment(endTime, 'HH:mm')
    while (cursor.isBefore(end)) {
      const next = moment(cursor).add(60, 'minutes')
      slots.push({ startTime: cursor.format('HH:mm'), endTime: next.format('HH:mm') })
      cursor = next
    }
    return slots
  }

  const hasResaleActivity = (b: Booking) =>
    (b.resaleOutcome && b.resaleOutcome !== BookingResaleOutcome.None) ||
    ((b.resaleSoldRanges?.length ?? 0) > 0)

  interface DisplayRow {
    key: string; courtID: string; date: string; startTime: string; endTime: string;
    bookings: Booking[]; representative: Booking;
  }

  const getDisplayRows = (bookings: Booking[]): DisplayRow[] => {
    const sorted = [...bookings].sort((a, b) => {
      if (a.courtID !== b.courtID) return a.courtID.localeCompare(b.courtID)
      const da = moment(a.date).valueOf(), db = moment(b.date).valueOf()
      if (da !== db) return da - db
      return moment(a.startTime, 'HH:mm').diff(moment(b.startTime, 'HH:mm'))
    })
    const rows: DisplayRow[] = []
    for (const booking of sorted) {
      const last = rows[rows.length - 1]
      const canMerge = last !== undefined &&
        last.courtID === booking.courtID &&
        moment(last.date).isSame(moment(booking.date), 'day') &&
        last.endTime === booking.startTime &&
        last.representative.status === booking.status &&
        !hasResaleActivity(last.bookings[last.bookings.length - 1]) &&
        !hasResaleActivity(booking)
      if (canMerge) {
        last.endTime = booking.endTime
        last.bookings.push(booking)
      } else {
        rows.push({ key: booking.id, courtID: booking.courtID, date: booking.date,
          startTime: booking.startTime, endTime: booking.endTime,
          bookings: [booking], representative: booking })
      }
    }
    return rows
  }

  const handleResellClick = (bookingOrArray: Booking | Booking[]) => {
    const bookingsArr = Array.isArray(bookingOrArray) ? bookingOrArray : [bookingOrArray]
    const first = bookingsArr[0]
    setResellBooking(first)
    setResellPrice(String(first.totalPrice))
    setResellError(null)
    if (bookingsArr.length > 1) {
      // Merged row: one checkbox per eligible 1-hour booking
      const config: Record<string, { selected: boolean; price: string; bookingID?: string }> = {}
      for (const b of bookingsArr) {
        if (!isResellEligible(b)) continue
        config[`${b.startTime}|${b.endTime}`] = { selected: false, price: String(b.totalPrice), bookingID: b.id }
      }
      setResellSlotConfig(config)
    } else {
      const booking = first
      const durationMins = moment(booking.endTime, 'HH:mm').diff(moment(booking.startTime, 'HH:mm'), 'minutes')
      if (durationMins > 60) {
        // Legacy: single multi-hour booking (old data)
        const config: Record<string, { selected: boolean; price: string; bookingID?: string }> = {}
        const hourlyPrice = (booking.totalPrice / (durationMins / 60)).toFixed(2)
        const soldRanges = booking.resaleSoldRanges ?? []
        let cursor = moment(booking.startTime, 'HH:mm')
        const end = moment(booking.endTime, 'HH:mm')
        while (cursor.isBefore(end)) {
          const slotEnd = moment(cursor).add(60, 'minutes')
          const key = `${cursor.format('HH:mm')}|${slotEnd.format('HH:mm')}`
          const isSold = soldRanges.some((r) => r.startTime === cursor.format('HH:mm'))
          if (!isSold) config[key] = { selected: false, price: hourlyPrice }
          cursor = slotEnd
        }
        setResellSlotConfig(config)
      } else {
        setResellSlotConfig({})
      }
    }
    setResellDialogOpen(true)
  }

  const handleConfirmResell = async() => {
    if (!resellBooking) return

    // Save payment info first if the player doesn't have one yet
    const hasPaymentInfo = !!(myPlayer?.paymentInfo?.accountNumber || myPlayer?.paymentInfo?.promptPayID)
    const newPayInfo = {
      bankName: payInfoBankName.trim() || undefined,
      accountName: payInfoAccountName.trim() || undefined,
      accountNumber: payInfoAccountNumber.trim() || undefined,
      promptPayID: payInfoPromptPay.trim() || undefined,
    }
    const isNewPayInfoProvided = !!(newPayInfo.accountNumber || newPayInfo.promptPayID)
    if (!hasPaymentInfo && !isNewPayInfoProvided) {
      setResellError('Please provide your payment information so we can transfer your payout')
      return
    }
    if (!hasPaymentInfo && isNewPayInfoProvided && myPlayer?.id) {
      try {
        await playersService.updateMe(myPlayer.id, { paymentInfo: newPayInfo })
        mutateMyPlayer()
      } catch {
        setResellError('Failed to save payment information')
        return
      }
    }

    const isMultiSlot = Object.keys(resellSlotConfig).length > 0
    if (isMultiSlot) {
      const selected = Object.entries(resellSlotConfig).filter(([, v]) => v.selected)
      if (selected.length === 0) { setResellError('Select at least one slot'); return }
      for (const [, { price }] of selected) {
        const p = parseFloat(price)
        if (isNaN(p) || p <= 0) { setResellError('Enter a valid price for each selected slot'); return }
      }
      try {
        setResellSubmitting(true)
        setResellError(null)
        for (const [key, { price, bookingID }] of selected) {
          if (bookingID) {
            await resaleService.create(bookingID, parseFloat(price))
          } else {
            const [subStartTime, subEndTime] = key.split('|')
            await resaleService.create(resellBooking.id, parseFloat(price), subStartTime, subEndTime)
          }
        }
        mutateBookings()
        setResellDialogOpen(false)
        setResellBooking(null)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const msg = (err.response?.data as { message?: string } | undefined)?.message
          setResellError(msg ?? 'Failed to create resale listing')
        } else {
          setResellError(err instanceof Error ? err.message : 'Failed to create resale listing')
        }
      } finally {
        setResellSubmitting(false)
      }
    } else {
      const price = parseFloat(resellPrice)
      if (isNaN(price) || price <= 0) { setResellError('Enter a valid price'); return }
      try {
        setResellSubmitting(true)
        setResellError(null)
        await resaleService.create(resellBooking.id, price)
        mutateBookings()
        setResellDialogOpen(false)
        setResellBooking(null)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const msg = (err.response?.data as { message?: string } | undefined)?.message
          setResellError(msg ?? 'Failed to create resale listing')
        } else {
          setResellError(err instanceof Error ? err.message : 'Failed to create resale listing')
        }
      } finally {
        setResellSubmitting(false)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'confirmed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
      return 'warning'
    case 'unpaid':
      return 'error'
    case 'refunded':
      return 'info'
    default:
      return 'default'
    }
  }

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 'bold' }}>
          {t('booking.myBookings')}
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Upcoming (${activeBookings.length})`} value="active" />
          <Tab label={`Past (${pastBookings.length})`} value="past" />
          <Tab label={`Cancelled (${cancelledBookings.length})`} value="cancelled" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {bookings.length === 0 ? (
          <Alert severity="info">
            {t('booking.noBookingsFound')}
          </Alert>
        ) : displayedBookings.length === 0 ? (
          <Alert severity="info">
            No {activeTab === 'cancelled' ? 'cancelled' : activeTab === 'past' ? 'past' : 'upcoming'} bookings found.
          </Alert>
        ) : (
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {displayedBookings.map((group) => {
                const firstCourt = courtDetails[group.bookings[0]?.courtID]
                const venue = firstCourt ? venueDetails[firstCourt.venueID] : undefined
                return (
                  <Card key={group.groupKey} variant="outlined">
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.25 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {venue ? (venue.name.en || venue.name.th) : '—'}
                        </Typography>
                        {group.bookingRef && (
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', px: 1, py: 0.25, borderRadius: 1, fontWeight: 700, letterSpacing: 1 }}>
                            #{group.bookingRef}
                          </Typography>
                        )}
                      </Box>
                      {getDisplayRows(group.bookings).map((row, idx, arr) => {
                        const dateStr = moment(row.date).format('DD MMM YYYY')
                        const prevDateStr = idx > 0 ? moment(arr[idx - 1].date).format('DD MMM YYYY') : null
                        const showDate = dateStr !== prevDateStr
                        const booking = row.representative
                        const isCancelledSlot = booking.status === 'cancelled'
                        const isDateFullyCancelled = arr.filter((r) => moment(r.date).format('DD MMM YYYY') === dateStr).every((r) => r.representative.status === 'cancelled')
                        if (row.bookings.length > 1) {
                          // Merged: consecutive hours, no resale activity
                          const eligibleBookings = row.bookings.filter(isResellEligible)
                          return (
                            <Box key={row.key} sx={{ mb: 0.5, opacity: isCancelledSlot ? 0.5 : 1 }}>
                              {showDate && <Typography variant="body2" fontWeight={600} sx={{ textDecoration: isDateFullyCancelled ? 'line-through' : 'none' }}>{dateStr}</Typography>}
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: isCancelledSlot ? 'line-through' : 'none' }}>{row.startTime} – {row.endTime}</Typography>
                                <Typography variant="body2" color="text.secondary">·</Typography>
                                <Typography variant="body2" color="text.secondary">{courtDetails[row.courtID]?.name || '—'}</Typography>
                                {isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                {eligibleBookings.length > 0 && (
                                  <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleResellClick(eligibleBookings)}>
                                    Resell
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          )
                        }
                        const isListedForSale = booking.resaleOutcome === BookingResaleOutcome.Listed
                        const listedSubRange = getListedSubRange(booking)
                        const soldRanges = booking.resaleSoldRanges ?? []
                        const showPerHour = ((isListedForSale && listedSubRange !== null) || soldRanges.length > 0) && booking.durationMinutes > 60
                        return (
                          <Box key={row.key} sx={{ mb: 0.5, opacity: isCancelledSlot ? 0.5 : 1 }}>
                            {showDate && (
                              <Typography variant="body2" fontWeight={600} sx={{ textDecoration: isDateFullyCancelled ? 'line-through' : 'none' }}>{dateStr}</Typography>
                            )}
                            {showPerHour ? (
                              <>
                                {getHourSlots(booking.startTime, booking.endTime).map((slot) => {
                                  const isSoldSlot = soldRanges.some((r) => r.startTime === slot.startTime)
                                  const isListedSlot = listedSubRange?.startTime === slot.startTime
                                  return (
                                    <Box key={slot.startTime} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                      <Typography variant="body2" color="text.secondary" sx={{ textDecoration: isCancelledSlot || isSoldSlot ? 'line-through' : 'none' }}>{slot.startTime} – {slot.endTime}</Typography>
                                      <Typography variant="body2" color="text.secondary">·</Typography>
                                      <Typography variant="body2" color="text.secondary">{courtDetails[booking.courtID]?.name || '—'}</Typography>
                                      {isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                      {isSoldSlot && !isCancelledSlot && <Chip label="Sold" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                      {isListedSlot && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                      {isListedSlot && (
                                        <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                          Cancel Listing
                                        </Button>
                                      )}
                                    </Box>
                                  )
                                })}
                                {isResellEligible(booking) && (
                                  <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1, mt: 0.5 }} onClick={() => handleResellClick(booking)}>
                                    Resell
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: isCancelledSlot ? 'line-through' : 'none' }}>{booking.startTime} – {booking.endTime}</Typography>
                                <Typography variant="body2" color="text.secondary">·</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: isCancelledSlot ? 'line-through' : 'none' }}>{courtDetails[booking.courtID]?.name || '—'}</Typography>
                                {isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                {isListedForSale && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                {isListedForSale && (
                                  <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                    Cancel Listing
                                  </Button>
                                )}
                                {isResellEligible(booking) && (
                                  <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleResellClick(booking)}>
                                    Resell
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Box>
                        )
                      })}
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {(Number(group.totalPrice) || 0).toFixed(2)} {group.currency}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={group.status}
                            size="small"
                            color={getStatusColor(group.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                            variant="outlined"
                          />
                          <Chip
                            label={group.paymentStatus}
                            size="small"
                            color={getPaymentStatusColor(group.paymentStatus) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      {group.paymentStatus === 'unpaid' && group.status !== 'cancelled' &&
                        group.bookings[0]?.createdAt && (
                        <BookingCountdown createdAt={group.bookings[0].createdAt} />
                      )}
                    </CardContent>
                    {(group.status === 'confirmed' || group.status === 'pending') && (
                      <CardActions sx={{ pt: 0, px: 2, pb: 1.5, gap: 1 }}>
                        {group.paymentStatus === 'unpaid' && group.bundleID &&
                          (!group.bookings[0]?.createdAt || Date.now() < new Date(group.bookings[0].createdAt).getTime() + EXPIRY_MINUTES * 60 * 1000) && (
                          <Button
                            size="small"
                            color="primary"
                            variant="contained"
                            onClick={() => handlePayBundle(group.bundleID as string, group.bookings.map((b) => b.id), group.currency)}
                            disabled={payingBundleID === group.bundleID}
                          >
                            {t('booking.pay')}
                          </Button>
                        )}
                      </CardActions>
                    )}
                  </Card>
                )
              })}
            </Box>
          ) : (
            <Box component={Paper} sx={{ maxHeight: 520, overflow: 'auto' }}>
              <Table stickyHeader sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>Ref</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>Venue</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>{t('booking.date')}</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>{t('booking.court')}</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>{t('booking.time')}</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>{t('booking.price')}</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>{t('booking.status')}</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>{t('booking.paymentStatus')}</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>{t('booking.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedBookings.map((group) => {
                    const firstCourt = courtDetails[group.bookings[0]?.courtID]
                    const venue = firstCourt ? venueDetails[firstCourt.venueID] : undefined
                    return (
                      <TableRow key={group.groupKey} hover>
                        <TableCell>
                          {group.bookingRef ? (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>#{group.bookingRef}</Typography>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {venue ? (venue.name.en || venue.name.th) : '—'}
                        </TableCell>
                        {(() => {
                          const mergedRows = getDisplayRows(group.bookings)
                          return (
                            <>
                              <TableCell>
                                {mergedRows.map((row, idx) => {
                                  const dateStr = moment(row.date).format('DD/MM/YYYY')
                                  const prevDateStr = idx > 0 ? moment(mergedRows[idx - 1].date).format('DD/MM/YYYY') : null
                                  const isCancelledSlot = row.representative.status === 'cancelled'
                                  const isDateFullyCancelled = mergedRows.filter((r) => moment(r.date).format('DD/MM/YYYY') === dateStr).every((r) => r.representative.status === 'cancelled')
                                  return (
                                    <Typography key={row.key} variant="body2" sx={{ mb: 0.25, opacity: isCancelledSlot ? 0.5 : 1, textDecoration: isDateFullyCancelled ? 'line-through' : 'none' }}>
                                      {dateStr !== prevDateStr ? dateStr : ''}
                                    </Typography>
                                  )
                                })}
                              </TableCell>
                              <TableCell>
                                {mergedRows.map((row) => {
                                  const isCancelledSlot = row.representative.status === 'cancelled'
                                  return (
                                    <Typography key={row.key} variant="body2" sx={{ mb: 0.25, opacity: isCancelledSlot ? 0.5 : 1, textDecoration: isCancelledSlot ? 'line-through' : 'none' }}>
                                      {courtDetails[row.courtID]?.name || '—'}
                                    </Typography>
                                  )
                                })}
                              </TableCell>
                              <TableCell>
                                {mergedRows.map((row) => {
                                  const booking = row.representative
                                  const isCancelledSlot = booking.status === 'cancelled'
                                  if (row.bookings.length > 1) {
                                    const eligibleBookings = row.bookings.filter(isResellEligible)
                                    return (
                                      <Box key={row.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25, flexWrap: 'wrap' }}>
                                        <Typography variant="body2" sx={{ opacity: isCancelledSlot ? 0.5 : 1, textDecoration: isCancelledSlot ? 'line-through' : 'none' }}>
                                          {row.startTime} – {row.endTime}
                                        </Typography>
                                        {isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                        {eligibleBookings.length > 0 && (
                                          <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleResellClick(eligibleBookings)}>
                                            Resell
                                          </Button>
                                        )}
                                      </Box>
                                    )
                                  }
                                  const isListedForSale = booking.resaleOutcome === BookingResaleOutcome.Listed
                                  const listedSubRange = getListedSubRange(booking)
                                  const soldRanges = booking.resaleSoldRanges ?? []
                                  const showPerHour = ((isListedForSale && listedSubRange !== null) || soldRanges.length > 0) && booking.durationMinutes > 60
                                  return (
                                    <Box key={row.key}>
                                      {showPerHour ? (
                                        <>
                                          {getHourSlots(booking.startTime, booking.endTime).map((slot) => {
                                            const isSoldSlot = soldRanges.some((r) => r.startTime === slot.startTime)
                                            const isListedSlot = listedSubRange?.startTime === slot.startTime
                                            return (
                                              <Box key={slot.startTime} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25, flexWrap: 'wrap' }}>
                                                <Typography variant="body2" sx={{ opacity: isCancelledSlot ? 0.5 : 1, textDecoration: isCancelledSlot || isSoldSlot ? 'line-through' : 'none' }}>
                                                  {slot.startTime} – {slot.endTime}
                                                </Typography>
                                                {isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                                {isSoldSlot && !isCancelledSlot && <Chip label="Sold" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                                {isListedSlot && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                                {isListedSlot && (
                                                  <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                                    Cancel Listing
                                                  </Button>
                                                )}
                                              </Box>
                                            )
                                          })}
                                          {isResellEligible(booking) && (
                                            <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1, mt: 0.5 }} onClick={() => handleResellClick(booking)}>
                                              Resell
                                            </Button>
                                          )}
                                        </>
                                      ) : (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25, flexWrap: 'wrap' }}>
                                          <Typography variant="body2" sx={{ opacity: isCancelledSlot ? 0.5 : 1, textDecoration: isCancelledSlot ? 'line-through' : 'none' }}>
                                            {booking.startTime} – {booking.endTime}
                                          </Typography>
                                          {isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                          {isListedForSale && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                          {isListedForSale && (
                                            <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                              Cancel Listing
                                            </Button>
                                          )}
                                          {isResellEligible(booking) && (
                                            <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleResellClick(booking)}>
                                              Resell
                                            </Button>
                                          )}
                                        </Box>
                                      )}
                                    </Box>
                                  )
                                })}
                              </TableCell>
                            </>
                          )
                        })()}
                        <TableCell>
                          {(Number(group.totalPrice) || 0).toFixed(2)} {group.currency}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={group.status}
                            size="small"
                            color={getStatusColor(group.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={group.paymentStatus}
                            size="small"
                            color={getPaymentStatusColor(group.paymentStatus) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                            variant="outlined"
                          />
                          {group.paymentStatus === 'unpaid' && group.status !== 'cancelled' &&
                            group.bookings[0]?.createdAt && (
                            <BookingCountdown createdAt={group.bookings[0].createdAt} />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {(group.status === 'confirmed' || group.status === 'pending') && (
                            <>
                              {group.paymentStatus === 'unpaid' && group.bundleID &&
                                (!group.bookings[0]?.createdAt || Date.now() < new Date(group.bookings[0].createdAt).getTime() + EXPIRY_MINUTES * 60 * 1000) && (
                                <Button
                                  size="small"
                                  color="primary"
                                  variant="contained"
                                  sx={{ ml: 1 }}
                                  onClick={() => handlePayBundle(group.bundleID as string, group.bookings.map((b) => b.id), group.currency)}
                                  disabled={payingBundleID === group.bundleID}
                                >
                                  {t('booking.pay')}
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          )
        )}

        <Dialog
          open={cancelDialogOpen}
          onClose={() => {
            setCancelDialogOpen(false)
            setSelectedBookingIds([])
          }}
        >
          <DialogTitle>{t('booking.confirmCancel')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('booking.cancelBookingMessage')}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>{t('booking.goBack')}</Button>
            <Button
              onClick={handleConfirmCancel}
              color="error"
              variant="contained"
              disabled={cancelling}
            >
              {cancelling ? <CircularProgress size={24} /> : t('booking.confirmCancel')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={payDialogOpen}
          onClose={() => !paySubmitting && setPayDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('booking.uploadSlip')}</DialogTitle>
          <DialogContent>
            {/* Booking details */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                {t('booking.bookingDetails')}
              </Typography>
              {payTargetVenue && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>{t('booking.venue')}:</strong> {payTargetVenue.name.en || payTargetVenue.name.th}
                </Typography>
              )}
              {payTargetBookings.map((b) => {
                const court = courtDetails[b.courtID]
                return (
                  <Box key={b.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                    <Typography variant="body2">
                      {court?.name ?? b.courtID} &nbsp;·&nbsp; {moment(b.date).format('DD/MM/YYYY')} &nbsp;·&nbsp; {b.startTime}–{b.endTime}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, ml: 2, whiteSpace: 'nowrap' }}>
                      {(Number(b.totalPrice) || 0).toFixed(2)} {b.currency}
                    </Typography>
                  </Box>
                )
              })}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('booking.total')}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {payTargetBookings.reduce((sum, b) => sum + (parseFloat(String(b.totalPrice)) || 0), 0).toFixed(2)} {payTargetCurrency}
                </Typography>
              </Box>
            </Box>

            {/* Payment method */}
            {isResalePay ? (
              (() => {
                const sysPromptPayID = process.env.NEXT_PUBLIC_SYSTEM_PROMPT_PAY_ID
                const sysBankName = process.env.NEXT_PUBLIC_SYSTEM_BANK_NAME
                const sysAccountName = process.env.NEXT_PUBLIC_SYSTEM_ACCOUNT_NAME
                const sysAccountNumber = process.env.NEXT_PUBLIC_SYSTEM_ACCOUNT_NUMBER
                const promptPayTotal = payTargetBookings.reduce((sum, b) => sum + (parseFloat(String(b.totalPrice)) || 0), 0)
                return (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      {t('booking.paymentMethod')}
                    </Typography>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      {sysBankName && <Typography variant="body2"><strong>{t('booking.bankName')}:</strong> {sysBankName}</Typography>}
                      {sysAccountName && <Typography variant="body2"><strong>{t('booking.accountName')}:</strong> {sysAccountName}</Typography>}
                      {sysAccountNumber && <Typography variant="body2"><strong>{t('booking.accountNumber')}:</strong> {sysAccountNumber}</Typography>}
                      {sysPromptPayID && (
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Box ref={qrFrameRef} sx={{ width: 240, borderRadius: 3, overflow: 'hidden', border: '1.5px solid #e0e0e0', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                            <Box component="img" src="/thai-qr-payment.webp" alt="Thai QR Payment" sx={{ width: '100%', display: 'block' }} />
                            <Box sx={{ bgcolor: '#fff', px: 2, pt: 1.5, pb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                              <QRCode value={generatePayload(sysPromptPayID, { amount: promptPayTotal })} size={168} style={{ display: 'block' }} />
                              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a237e', letterSpacing: 0.5 }}>
                                {promptPayTotal.toFixed(2)} <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 400 }}>{payTargetCurrency}</Box>
                              </Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: '#666', letterSpacing: 0.5, pb: 0.5 }}>สแกนเพื่อชำระเงิน</Typography>
                            </Box>
                          </Box>
                          <Button size="small" variant="outlined" startIcon={<Download />} onClick={handleSaveQR}>บันทึก QR</Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )
              })()
            ) : payTargetVenue?.payment ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  {t('booking.paymentMethod')}
                </Typography>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="body2"><strong>{t('booking.bankName')}:</strong> {payTargetVenue.payment.bankName}</Typography>
                  <Typography variant="body2"><strong>{t('booking.accountName')}:</strong> {payTargetVenue.payment.accountName}</Typography>
                  <Typography variant="body2"><strong>{t('booking.accountNumber')}:</strong> {payTargetVenue.payment.accountNumber}</Typography>
                  {payTargetVenue.payment.promptPayID && (() => {
                    const promptPayTotal = payTargetBookings.reduce((sum, b) => sum + (parseFloat(String(b.totalPrice)) || 0), 0)
                    return (
                      <>
                        {/* PromptPay QR Frame */}
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Box ref={qrFrameRef} sx={{
                            width: 240,
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: '1.5px solid #e0e0e0',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          }}>
                            {/* Header image */}
                            <Box
                              component="img"
                              src="/thai-qr-payment.webp"
                              alt="Thai QR Payment"
                              sx={{ width: '100%', display: 'block' }}
                            />

                            {/* QR Code area */}
                            <Box sx={{ bgcolor: '#fff', px: 2, pt: 1.5, pb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                              <QRCode
                                value={generatePayload(payTargetVenue.payment.promptPayID, { amount: promptPayTotal })}
                                size={168}
                                style={{ display: 'block' }}
                              />
                              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a237e', letterSpacing: 0.5 }}>
                                {promptPayTotal.toFixed(2)} <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 400 }}>{payTargetCurrency}</Box>
                              </Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: '#666', letterSpacing: 0.5, pb: 0.5 }}>
                                สแกนเพื่อชำระเงิน
                              </Typography>
                            </Box>
                          </Box>
                          <Button size="small" variant="outlined" startIcon={<Download />} onClick={handleSaveQR}>
                            บันทึก QR
                          </Button>
                        </Box>
                      </>
                    )
                  })()}
                  {payTargetVenue.payment.qrCodeUrl && (
                    <img
                      src={payTargetVenue.payment.qrCodeUrl}
                      alt="QR Code"
                      style={{ marginTop: 8, maxWidth: 160, display: 'block' }}
                    />
                  )}
                </Box>
              </Box>
            ) : null}

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" sx={{ mb: 2 }}>
              {t('booking.uploadSlipInstruction')}
            </Typography>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mb: 2 }}
            >
              {slipFile ? t('booking.fileSelected') : t('booking.chooseFile')}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleSlipFileChange}
              />
            </Button>
            {payError && (
              <Alert severity="error" sx={{ mb: 2 }}>{payError}</Alert>
            )}
            {slipPreview && (
              <img
                src={slipPreview}
                alt="slip preview"
                style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 4, marginBottom: 12 }}
              />
            )}
            <TextField
              size="small"
              fullWidth
              label={t('booking.note')}
              value={slipNote}
              onChange={(e) => setSlipNote(e.target.value)}
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayDialogOpen(false)} disabled={paySubmitting}>
              {t('booking.cancel')}
            </Button>
            <Button
              onClick={handleConfirmPay}
              variant="contained"
              disabled={!slipPreview || paySubmitting}
            >
              {paySubmitting ? <CircularProgress size={20} /> : t('booking.confirmBooking')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Resell Dialog ──────────────────────────────────── */}
        <Dialog open={resellDialogOpen} onClose={() => !resellSubmitting && setResellDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>List Slot for Resale</DialogTitle>
          <DialogContent>
            {resellBooking && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600}>{courtDetails[resellBooking.courtID]?.name ?? '—'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {moment(resellBooking.date).format('DD MMM YYYY')} · {resellBooking.startTime} – {resellBooking.endTime}
                </Typography>
              </Box>
            )}

            {/* Fee notice */}
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
              A <strong>10% processing fee</strong> will be deducted from your asking price. Payout is transferred to your account within <strong>3 business days</strong> after the buyer pays.
            </Alert>

            {Object.keys(resellSlotConfig).length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Select which hours to list for resale:</Typography>
                {Object.entries(resellSlotConfig).map(([key, { selected, price }]) => {
                  const [slotStart, slotEnd] = key.split('|')
                  return (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: selected ? 'warning.main' : 'divider', borderRadius: 1, bgcolor: selected ? '#fffbeb' : undefined }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => setResellSlotConfig((prev) => ({ ...prev, [key]: { ...prev[key], selected: e.target.checked } }))}
                        style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 110 }}>{slotStart} – {slotEnd}</Typography>
                      <TextField
                        size="small"
                        type="number"
                        label="Price"
                        value={price}
                        disabled={!selected}
                        onChange={(e) => setResellSlotConfig((prev) => ({ ...prev, [key]: { ...prev[key], price: e.target.value } }))}
                        inputProps={{ min: 0 }}
                        sx={{ width: 100 }}
                      />
                    </Box>
                  )
                })}
              </Box>
            ) : (
              <TextField
                label="Asking price"
                type="number"
                fullWidth
                size="small"
                value={resellPrice}
                onChange={(e) => setResellPrice(e.target.value)}
                inputProps={{ min: 0 }}
              />
            )}

            {/* Payment info — only shown if not already saved */}
            {!(myPlayer?.paymentInfo?.accountNumber || myPlayer?.paymentInfo?.promptPayID) && (
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Payout Account</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  We need your bank or PromptPay details to transfer your payout.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField size="small" fullWidth label="Bank Name" value={payInfoBankName} onChange={(e) => setPayInfoBankName(e.target.value)} />
                  <TextField size="small" fullWidth label="Account Name" value={payInfoAccountName} onChange={(e) => setPayInfoAccountName(e.target.value)} />
                  <TextField size="small" fullWidth label="Account Number" value={payInfoAccountNumber} onChange={(e) => setPayInfoAccountNumber(e.target.value)} />
                  <TextField size="small" fullWidth label="PromptPay ID (phone / national ID)" value={payInfoPromptPay} onChange={(e) => setPayInfoPromptPay(e.target.value)} />
                </Box>
              </Box>
            )}
            {(myPlayer?.paymentInfo?.accountNumber || myPlayer?.paymentInfo?.promptPayID) && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Payout to:</Typography>
                {myPlayer.paymentInfo.accountName && <Typography variant="body2">{myPlayer.paymentInfo.accountName}</Typography>}
                {myPlayer.paymentInfo.bankName && <Typography variant="body2">{myPlayer.paymentInfo.bankName}</Typography>}
                {myPlayer.paymentInfo.accountNumber && <Typography variant="body2">Acc: {myPlayer.paymentInfo.accountNumber}</Typography>}
                {myPlayer.paymentInfo.promptPayID && <Typography variant="body2">PromptPay: {myPlayer.paymentInfo.promptPayID}</Typography>}
              </Box>
            )}

            {resellError && <Alert severity="error" sx={{ mt: 2 }}>{resellError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResellDialogOpen(false)} disabled={resellSubmitting}>Cancel</Button>
            <Button onClick={handleConfirmResell} variant="contained" color="warning" disabled={resellSubmitting}>
              {resellSubmitting ? <CircularProgress size={20} /> : 'List for Resale'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}
