'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
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
import { MyBookingsTab, MyBookingsPagedResponse } from '../services/bookings'
import resaleService from '../services/resale'
import playersService from '../services/players'
import courtsService from '../services/courts'
import venueService from '../services/venues'
import { useMyPlayer } from '../libs/data'
import { useAppSelector } from '../libs/redux/store'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import Layout from '../components/Layout'
import axios from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import { deriveGroupedPaymentStatus, getBookingDateBundleGroupKey } from './grouping'

const EXPIRY_MINUTES = 10

const TAB_DEFAULT_LIMITS: Record<MyBookingsTab, number> = {
  active: 10,
  past: 5,
  cancelled: 5,
}

interface TabPagedState {
  bookings: Booking[];
  hasMore: boolean;
  nextCursor: string | null;
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  loadedOnce: boolean;
}

const EMPTY_TAB_STATE: TabPagedState = {
  bookings: [],
  hasMore: false,
  nextCursor: null,
  isLoadingInitial: false,
  isLoadingMore: false,
  loadedOnce: false,
}

const createInitialTabsState = (): Record<MyBookingsTab, TabPagedState> => ({
  active: { ...EMPTY_TAB_STATE },
  past: { ...EMPTY_TAB_STATE },
  cancelled: { ...EMPTY_TAB_STATE },
})

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

function MyBookingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightKey = searchParams.get('highlight')
  const user = useAppSelector((state) => state.app.user)
  const userReady = useAppSelector((state) => state.app.userReady)

  useEffect(() => {
    if (userReady && !user) router.replace('/')
  }, [userReady, user, router])

  const [activeTab, setActiveTab] = useState<MyBookingsTab>('active')
  const [tabState, setTabState] = useState<Record<MyBookingsTab, TabPagedState>>(createInitialTabsState)
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [venueDetails, setVenueDetails] = useState<Record<string, Venue>>({})
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null)
  const desktopTableRef = useRef<HTMLDivElement | null>(null)

  const currentTabState = tabState[activeTab]
  const bookings = currentTabState.bookings
  const loading = currentTabState.isLoadingInitial
  const loadingMore = currentTabState.isLoadingMore
  const hasMore = currentTabState.hasMore

  const mergeUniqueBookings = (current: Booking[], incoming: Booking[]): Booking[] => {
    const map = new Map<string, Booking>()
    current.forEach((booking) => map.set(booking.id, booking))
    incoming.forEach((booking) => map.set(booking.id, booking))
    return Array.from(map.values())
  }

  const updateTabFromResponse = (tab: MyBookingsTab, response: MyBookingsPagedResponse, append: boolean) => {
    setTabState((prev) => {
      const existing = prev[tab]
      const mergedBookings = append ? mergeUniqueBookings(existing.bookings, response.bookings) : response.bookings
      return {
        ...prev,
        [tab]: {
          bookings: mergedBookings,
          hasMore: response.hasMore,
          nextCursor: response.nextCursor,
          isLoadingInitial: false,
          isLoadingMore: false,
          loadedOnce: true,
        },
      }
    })
  }

  const fetchTab = async(tab: MyBookingsTab, append: boolean): Promise<void> => {
    const current = tabState[tab]
    if (!user) {
      return
    }
    if (append && (!current.hasMore || current.isLoadingMore || current.isLoadingInitial)) {
      return
    }
    if (!append && current.isLoadingInitial) {
      return
    }

    setTabState((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        isLoadingInitial: append ? prev[tab].isLoadingInitial : true,
        isLoadingMore: append,
      },
    }))

    try {
      const response = await bookingsService.getPaged({
        tab,
        limit: TAB_DEFAULT_LIMITS[tab],
        cursor: append ? current.nextCursor ?? undefined : undefined,
      })
      updateTabFromResponse(tab, response, append)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings'
      setError(message)
      setTabState((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          isLoadingInitial: false,
          isLoadingMore: false,
        },
      }))
    }
  }

  const refreshActiveTab = async(): Promise<void> => {
    await fetchTab(activeTab, false)
  }

  useEffect(() => {
    if (!user) return
    if (!tabState.active.loadedOnce && !tabState.active.isLoadingInitial) {
      fetchTab('active', false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!tabState[activeTab].loadedOnce && !tabState[activeTab].isLoadingInitial) {
      fetchTab(activeTab, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

  // Scroll to highlighted booking after data loads
  useEffect(() => {
    if (!highlightKey || loading) return
    const el = document.getElementById(`booking-${highlightKey}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.outline = '2px solid'
      el.style.outlineColor = '#1976d2'
      el.style.borderRadius = '8px'
      setTimeout(() => {
        el.style.outline = ''
        el.style.outlineColor = ''
      }, 3000)
    }

  }, [loading, highlightKey, courtDetails])
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([])
  const [cancelling, setCancelling] = useState(false)
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
      const key = getBookingDateBundleGroupKey(booking)
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
      const paymentStatus = deriveGroupedPaymentStatus(sortedItems)

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
        paymentStatus,
      }
    })

    return grouped.sort((a, b) => {
      const aDate = moment(`${a.date} ${a.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
      const bDate = moment(`${b.date} ${b.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
      return activeTab === 'active' ? aDate - bDate : bDate - aDate
    })
  }, [bookings, activeTab])
  const groupedCountByTab = useMemo(() => {
    const result: Record<MyBookingsTab, number> = { active: 0, past: 0, cancelled: 0 }
    ;(['active', 'past', 'cancelled'] as MyBookingsTab[]).forEach((tab) => {
      const keySet = new Set<string>()
      tabState[tab].bookings.forEach((booking) => keySet.add(getBookingDateBundleGroupKey(booking)))
      result[tab] = keySet.size
    })
    return result
  }, [tabState])

  const displayedBookings = groupedBookings
  const canShowResellActions = activeTab === 'active'
  const shouldShowInlineCancelledState = activeTab !== 'cancelled'

  // Load court and venue details for currently loaded tab bookings
  useEffect(() => {
    if (!bookings.length) return
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
      await refreshActiveTab()

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

  const handlePayBundle = (bundleID: string) => {
    router.push(`/pay?bundleID=${bundleID}`)
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
      await refreshActiveTab()
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
        await refreshActiveTab()
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
        await refreshActiveTab()
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

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return
    fetchTab(activeTab, true)
  }

  useEffect(() => {
    if (!isMobile || !mobileLoadMoreRef.current) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        handleLoadMore()
      }
    }, { root: null, rootMargin: '200px 0px', threshold: 0 })
    observer.observe(mobileLoadMoreRef.current)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, activeTab, hasMore, loadingMore, loading])

  const handleDesktopScroll = () => {
    const el = desktopTableRef.current
    if (!el || loading || loadingMore || !hasMore) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120
    if (nearBottom) {
      handleLoadMore()
    }
  }

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
          <Tab label={`Upcoming (${groupedCountByTab.active})`} value="active" />
          <Tab label="Past" value="past" />
          <Tab label="Cancelled" value="cancelled" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {displayedBookings.length === 0 && !loading ? (
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
                  <Card key={group.groupKey} id={`booking-${group.groupKey}`} variant="outlined">
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.25 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {venue ? (venue.name?.en || venue.name?.th) : '—'}
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
                            <Box key={row.key} sx={{ mb: 0.5, opacity: isCancelledSlot && shouldShowInlineCancelledState ? 0.5 : 1 }}>
                              {showDate && <Typography variant="body2" fontWeight={600} sx={{ textDecoration: shouldShowInlineCancelledState && isDateFullyCancelled ? 'line-through' : 'none' }}>{dateStr}</Typography>}
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: shouldShowInlineCancelledState && isCancelledSlot ? 'line-through' : 'none' }}>{row.startTime} – {row.endTime}</Typography>
                                <Typography variant="body2" color="text.secondary">·</Typography>
                                <Typography variant="body2" color="text.secondary">{courtDetails[row.courtID]?.name || '—'}</Typography>
                                {shouldShowInlineCancelledState && isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                {canShowResellActions && eligibleBookings.length > 0 && (
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
                          <Box key={row.key} sx={{ mb: 0.5, opacity: isCancelledSlot && shouldShowInlineCancelledState ? 0.5 : 1 }}>
                            {showDate && (
                              <Typography variant="body2" fontWeight={600} sx={{ textDecoration: shouldShowInlineCancelledState && isDateFullyCancelled ? 'line-through' : 'none' }}>{dateStr}</Typography>
                            )}
                            {showPerHour ? (
                              <>
                                {getHourSlots(booking.startTime, booking.endTime).map((slot) => {
                                  const isSoldSlot = soldRanges.some((r) => r.startTime === slot.startTime)
                                  const isListedSlot = listedSubRange?.startTime === slot.startTime
                                  return (
                                    <Box key={slot.startTime} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                      <Typography variant="body2" color="text.secondary" sx={{ textDecoration: (shouldShowInlineCancelledState && isCancelledSlot) || isSoldSlot ? 'line-through' : 'none' }}>{slot.startTime} – {slot.endTime}</Typography>
                                      <Typography variant="body2" color="text.secondary">·</Typography>
                                      <Typography variant="body2" color="text.secondary">{courtDetails[booking.courtID]?.name || '—'}</Typography>
                                      {shouldShowInlineCancelledState && isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                      {isSoldSlot && !isCancelledSlot && <Chip label="Sold" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                      {isListedSlot && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                      {canShowResellActions && isListedSlot && (
                                        <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                          Cancel Listing
                                        </Button>
                                      )}
                                    </Box>
                                  )
                                })}
                                {canShowResellActions && isResellEligible(booking) && (
                                  <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1, mt: 0.5 }} onClick={() => handleResellClick(booking)}>
                                    Resell
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: shouldShowInlineCancelledState && isCancelledSlot ? 'line-through' : 'none' }}>{booking.startTime} – {booking.endTime}</Typography>
                                <Typography variant="body2" color="text.secondary">·</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: shouldShowInlineCancelledState && isCancelledSlot ? 'line-through' : 'none' }}>{courtDetails[booking.courtID]?.name || '—'}</Typography>
                                {shouldShowInlineCancelledState && isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                {isListedForSale && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                {canShowResellActions && isListedForSale && (
                                  <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                    Cancel Listing
                                  </Button>
                                )}
                                {canShowResellActions && isResellEligible(booking) && (
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
                            fullWidth
                            onClick={() => handlePayBundle(group.bundleID as string)}
                          >
                            {t('booking.pay')}
                          </Button>
                        )}
                      </CardActions>
                    )}
                  </Card>
                )
              })}
              {loadingMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <Box ref={mobileLoadMoreRef} sx={{ height: 1 }} />
            </Box>
          ) : (
            <Box ref={desktopTableRef} onScroll={handleDesktopScroll} component={Paper} sx={{ maxHeight: 520, overflow: 'auto' }}>
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
                      <TableRow key={group.groupKey} id={`booking-${group.groupKey}`} hover>
                        <TableCell>
                          {group.bookingRef ? (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>#{group.bookingRef}</Typography>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {venue ? (venue.name?.en || venue.name?.th) : '—'}
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
                                    <Typography key={row.key} variant="body2" sx={{ mb: 0.25, opacity: isCancelledSlot && shouldShowInlineCancelledState ? 0.5 : 1, textDecoration: shouldShowInlineCancelledState && isDateFullyCancelled ? 'line-through' : 'none' }}>
                                      {dateStr !== prevDateStr ? dateStr : ''}
                                    </Typography>
                                  )
                                })}
                              </TableCell>
                              <TableCell>
                                {mergedRows.map((row) => {
                                  const isCancelledSlot = row.representative.status === 'cancelled'
                                  return (
                                    <Typography key={row.key} variant="body2" sx={{ mb: 0.25, opacity: isCancelledSlot && shouldShowInlineCancelledState ? 0.5 : 1, textDecoration: shouldShowInlineCancelledState && isCancelledSlot ? 'line-through' : 'none' }}>
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
                                        <Typography variant="body2" sx={{ opacity: isCancelledSlot && shouldShowInlineCancelledState ? 0.5 : 1, textDecoration: shouldShowInlineCancelledState && isCancelledSlot ? 'line-through' : 'none' }}>
                                          {row.startTime} – {row.endTime}
                                        </Typography>
                                        {shouldShowInlineCancelledState && isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                        {canShowResellActions && eligibleBookings.length > 0 && (
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
                                                <Typography variant="body2" sx={{ opacity: isCancelledSlot && shouldShowInlineCancelledState ? 0.5 : 1, textDecoration: (shouldShowInlineCancelledState && isCancelledSlot) || isSoldSlot ? 'line-through' : 'none' }}>
                                                  {slot.startTime} – {slot.endTime}
                                                </Typography>
                                                {shouldShowInlineCancelledState && isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                                {isSoldSlot && !isCancelledSlot && <Chip label="Sold" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                                {isListedSlot && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                                {canShowResellActions && isListedSlot && (
                                                  <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                                    Cancel Listing
                                                  </Button>
                                                )}
                                              </Box>
                                            )
                                          })}
                                          {canShowResellActions && isResellEligible(booking) && (
                                            <Button size="small" variant="outlined" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1, mt: 0.5 }} onClick={() => handleResellClick(booking)}>
                                              Resell
                                            </Button>
                                          )}
                                        </>
                                      ) : (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25, flexWrap: 'wrap' }}>
                                          <Typography variant="body2" sx={{ opacity: isCancelledSlot && shouldShowInlineCancelledState ? 0.5 : 1, textDecoration: shouldShowInlineCancelledState && isCancelledSlot ? 'line-through' : 'none' }}>
                                            {booking.startTime} – {booking.endTime}
                                          </Typography>
                                          {shouldShowInlineCancelledState && isCancelledSlot && <Chip label="cancelled" size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                          {isListedForSale && <Chip label="For Sale" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                          {canShowResellActions && isListedForSale && (
                                            <Button size="small" color="warning" sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: '0.65rem', height: 20, lineHeight: 1 }} onClick={() => handleCancelListing(booking)}>
                                              Cancel Listing
                                            </Button>
                                          )}
                                          {canShowResellActions && isResellEligible(booking) && (
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
                                  onClick={() => handlePayBundle(group.bundleID as string)}
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
              {loadingMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                  <CircularProgress size={22} />
                </Box>
              )}
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
              A <strong>7% processing fee</strong> will be deducted from your asking price. Payout is transferred to your account within <strong>7 business days</strong> after the buyer pays.
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

export default function BookingsPageWrapper() {
  return (
    <Suspense>
      <MyBookingsPage />
    </Suspense>
  )
}
