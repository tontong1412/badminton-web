'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Alert,
  Avatar,
  CircularProgress,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Chip,
  IconButton,
  Paper,
  Drawer,
  List,
  ListItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import { BookingAvailability, Court, CourtPricingRule, Venue } from '@/type'
import courtsService from '../../services/courts'
import { useVenue, useCourts } from '../../libs/data'
import CourtBookingModal from '../../components/CourtBookingModal'
import CourtAvailabilityTable from '../../components/CourtAvailabilityTable'
import Layout from '../../components/Layout'
import LoginModal from '../../components/LoginModal'
import { useAppSelector } from '../../libs/redux/store'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

export default function VenueCourtsPage() {
  const { t } = useTranslation()
  const params = useParams()
  const venueId = params.id as string
  const currentUser = useAppSelector((state) => state.app.user)

  const [venue, setVenue] = useState<Venue | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  const [bookingMode, setBookingMode] = useState<'guided' | 'free'>('guided')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showSelectionDrawer, setShowSelectionDrawer] = useState(false)
  const [showGuidedDrawer, setShowGuidedDrawer] = useState(false)
  const [availabilityKey, setAvailabilityKey] = useState(0)
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [courtTypeFilter, setCourtTypeFilter] = useState<string | null>(null)

  const slotDurationMinutes = venue?.slotDurationMinutes ?? 30
  const courtTypes = [...new Set(courts.filter((c) => c.courtType).map((c) => c.courtType!))]
  const filteredCourts = useMemo(
    () => courtTypeFilter ? courts.filter((c) => c.courtType === courtTypeFilter) : courts,
    [courts, courtTypeFilter]
  )

  const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number)
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  // Merges sorted slot start-times into contiguous ranges.
  // Returns [{startTime, endTime}] where each range covers consecutive slots.
  const mergeSlots = (sortedTimes: string[]): { startTime: string; endTime: string }[] => {
    if (sortedTimes.length === 0) return []
    const ranges: { startTime: string; endTime: string }[] = []
    let rangeStart = sortedTimes[0]
    let rangeEnd = addMinutes(sortedTimes[0], slotDurationMinutes)
    for (let i = 1; i < sortedTimes.length; i++) {
      if (sortedTimes[i] === rangeEnd) {
        rangeEnd = addMinutes(sortedTimes[i], slotDurationMinutes)
      } else {
        ranges.push({ startTime: rangeStart, endTime: rangeEnd })
        rangeStart = sortedTimes[i]
        rangeEnd = addMinutes(sortedTimes[i], slotDurationMinutes)
      }
    }
    ranges.push({ startTime: rangeStart, endTime: rangeEnd })
    return ranges
  }

  // ── Guided mode state ──────────────────────────────────────────────────────
  const [requestedCourtCount, setRequestedCourtCount] = useState(1)
  const [requestedHours, setRequestedHours] = useState(1)
  const [guidedSlots, setGuidedSlots] = useState<{ startTime: string; endTime: string; courtCount: number; isSplit: boolean }[]>([])
  const [guidedSelectedSlot, setGuidedSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [guidedAvailableCourts, setGuidedAvailableCourts] = useState<Court[]>([])
  const [guidedSelectedCourts, setGuidedSelectedCourts] = useState<Court[]>([])
  const [guidedSplitAssignment, setGuidedSplitAssignment] = useState<{ court: Court; startTime: string; endTime: string }[] | null>(null)
  const [loadingGuided, setLoadingGuided] = useState(false)
  const [searchingGuidedCourts, setSearchingGuidedCourts] = useState(false)
  const [guidedError, setGuidedError] = useState<string | null>(null)
  const [showCourtPicker, setShowCourtPicker] = useState(false)

  const requestedDurationMinutes = requestedHours * 60

  // ── Free mode state ────────────────────────────────────────────────────────
  const [freeAvailability, setFreeAvailability] = useState<BookingAvailability[]>([])
  const [selectedCells, setSelectedCells] = useState<Map<string, Set<string>>>(new Map())
  const [loadingFree, setLoadingFree] = useState(false)
  const [freeError, setFreeError] = useState<string | null>(null)

  const freeSelectedCourts = courts.filter((c) => (selectedCells.get(c.id)?.size ?? 0) > 0)

  const calcRangePrice = (court: Court, startTime: string, endTime: string): number => {
    const rules = court.pricingRules ?? []
    const toM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const segStart = toM(startTime)
    const segEnd = toM(endTime)
    if (rules.length === 0) return Number(((court.pricePerHour / 60) * (segEnd - segStart)).toFixed(2))
    const boundaries = new Set<number>([segStart, segEnd])
    for (const rule of rules) {
      const rs = toM(rule.startTime), re = toM(rule.endTime)
      if (rs > segStart && rs < segEnd) boundaries.add(rs)
      if (re > segStart && re < segEnd) boundaries.add(re)
    }
    const sorted = Array.from(boundaries).sort((a, b) => a - b)
    let total = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      const s = sorted[i], e = sorted[i + 1]
      const rule = rules.find((r: CourtPricingRule) => toM(r.startTime) <= s && toM(r.endTime) >= e)
      total += ((rule ? rule.pricePerHour : court.pricePerHour) / 60) * (e - s)
    }
    return Number(total.toFixed(2))
  }

  const freeBookingItems = Array.from(selectedCells.entries())
    .filter(([, times]) => times.size > 0)
    .flatMap(([courtId, times]) =>
      mergeSlots(Array.from(times).sort()).map(({ startTime, endTime }) => ({
        courtID: courtId,
        date: selectedDate,
        startTime,
        endTime,
      }))
    )

  const freeTotalPrice = freeBookingItems.reduce((sum, item) => {
    const court = courts.find((c) => c.id === item.courtID)
    if (!court) return sum
    return sum + calcRangePrice(court, item.startTime, item.endTime)
  }, 0)
  const freeCurrency = freeSelectedCourts[0]?.currency ?? ''

  const guidedTotalPrice = guidedSplitAssignment
    ? guidedSplitAssignment.reduce((sum, { court, startTime, endTime }) => sum + calcRangePrice(court, startTime, endTime), 0)
    : guidedSelectedSlot
      ? guidedSelectedCourts.reduce((sum, court) => sum + calcRangePrice(court, guidedSelectedSlot.startTime, guidedSelectedSlot.endTime), 0)
      : 0
  const guidedCurrency = guidedSplitAssignment
    ? (guidedSplitAssignment[0]?.court.currency ?? '')
    : (guidedSelectedCourts[0]?.currency ?? '')

  const fmtPrice = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2)

  const freeSelectionValidation = (() => {
    if (selectedCells.size === 0) return { valid: false, error: null }
    return { valid: true, error: null }
  })()

  const { venue: swrVenue, isLoading: venueLoading, isError: venueError } = useVenue(venueId)
  const { courts: allCourts, isLoading: courtsLoading, isError: courtsError } = useCourts()

  // Sync SWR data into local state (other code reads these variables)
  useEffect(() => {
    if (swrVenue) setVenue(swrVenue)
  }, [swrVenue])
  useEffect(() => {
    if (allCourts.length > 0) setCourts(allCourts.filter((c) => c.venueID === venueId))
  }, [allCourts, venueId])
  useEffect(() => {
    setLoading(venueLoading || courtsLoading)
  }, [venueLoading, courtsLoading])
  useEffect(() => {
    if (venueError || courtsError) setError('Failed to load venue or courts')
  }, [venueError, courtsError])

  const router = useRouter()

  const handleBookingComplete = (isGuest: boolean) => {
    setShowBookingModal(false)
    setGuidedSelectedCourts([])
    setGuidedSelectedSlot(null)
    setGuidedAvailableCourts([])
    setGuidedSplitAssignment(null)
    setSelectedCells(new Map())
    if (isGuest) {
      setAvailabilityKey((k) => k + 1)
      setBookingSuccessMsg('Your booking has been made! Check your email for payment instructions.')
    } else {
      router.push('/bookings')
    }
  }

  // ── Guided mode effects & handlers ─────────────────────────────────────────
  useEffect(() => {
    setGuidedSelectedSlot(null)
    setGuidedAvailableCourts([])
    setGuidedSelectedCourts([])
    setGuidedSplitAssignment(null)
    setGuidedSlots([])
  }, [selectedDate])

  const prevDateRef = useRef(selectedDate)

  useEffect(() => {
    const loadGuided = async() => {
      if (!selectedDate || filteredCourts.length === 0) {
        setGuidedSlots([])
        return
      }

      prevDateRef.current = selectedDate
      setLoadingGuided(true)
      setGuidedSlots([])
      setGuidedError(null)

      try {
        const activeCourts = filteredCourts.filter((c) => c.status === 'active')
        const fetched = await Promise.all(
          activeCourts.map((c) => courtsService.getAvailability(c.id, selectedDate, requestedDurationMinutes))
        )

        const slotMap = new Map<string, { startTime: string; endTime: string; courtCount: number; isSplit: boolean }>()
        fetched.forEach((avail) => {
          avail.slots.forEach((slot) => {
            if (!slot.available) return
            if (moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())) return
            const key = `${slot.startTime}-${slot.endTime}`
            const existing = slotMap.get(key)
            if (existing) {
              existing.courtCount += 1
            } else {
              slotMap.set(key, { startTime: slot.startTime, endTime: slot.endTime, courtCount: 1, isSplit: false })
            }
          })
        })

        // Detect split-court slots: windows where different courts cover each sub-slot
        const numSubSlots = slotDurationMinutes > 0 ? Math.round(requestedDurationMinutes / slotDurationMinutes) : 1
        if (numSubSlots > 1) {
          const stepFetched = await Promise.all(
            activeCourts.map((c) => courtsService.getAvailability(c.id, selectedDate, slotDurationMinutes))
          )
          // courtId -> Set<availableStepStarts>
          const courtStepAvail = new Map<string, Set<string>>()
          stepFetched.forEach((avail, idx) => {
            const courtId = String(activeCourts[idx].id)
            const available = new Set<string>()
            avail.slots.forEach((s) => { if (s.available) available.add(s.startTime) })
            courtStepAvail.set(courtId, available)
          })
          // Potential window starts from step-level slots
          const allStepStarts = new Set<string>()
          stepFetched.forEach((avail) => avail.slots.forEach((s) => allStepStarts.add(s.startTime)))
          allStepStarts.forEach((windowStart) => {
            if (moment(`${selectedDate} ${windowStart}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())) return
            const windowEnd = addMinutes(windowStart, requestedDurationMinutes)
            const key = `${windowStart}-${windowEnd}`
            if (slotMap.has(key)) return  // already a same-court slot
            // Count available courts per sub-slot and take the minimum
            const minCourts = Math.min(...Array.from({ length: numSubSlots }, (_, i) => {
              const subStart = addMinutes(windowStart, i * slotDurationMinutes)
              let count = 0
              courtStepAvail.forEach((steps) => { if (steps.has(subStart)) count++ })
              return count
            }))
            if (minCourts >= requestedCourtCount) {
              slotMap.set(key, { startTime: windowStart, endTime: windowEnd, courtCount: minCourts, isSplit: true })
            }
          })
        }

        setGuidedSlots(
          Array.from(slotMap.values())
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
        )
      } catch (err) {
        setGuidedError(err instanceof Error ? err.message : 'Failed to load slots')
        setGuidedSlots([])
      } finally {
        setLoadingGuided(false)
      }
    }

    loadGuided()
  }, [selectedDate, filteredCourts, requestedDurationMinutes, availabilityKey, slotDurationMinutes, requestedCourtCount])

  const filteredGuidedSlots = useMemo(
    () => guidedSlots.filter((s) => s.courtCount >= requestedCourtCount),
    [guidedSlots, requestedCourtCount]
  )

  // Reset slot selection when court count or duration changes (no API re-fetch for court count)
  useEffect(() => {
    setGuidedSelectedSlot(null)
    setGuidedSelectedCourts([])
    setGuidedAvailableCourts([])
    setGuidedSplitAssignment(null)
    setShowCourtPicker(false)
  }, [requestedCourtCount, requestedDurationMinutes])

  /**
   * Given all courts and the available subset, suggest the best contiguous block
   * of `count` available courts (in natural name order) that is most adjacent to
   * already-booked courts (i.e., maximises booked neighbours on the block's edges).
   */
  const suggestCourts = (allCourts: Court[], availableCourts: Court[], count: number): Court[] => {
    if (count <= 0 || availableCourts.length < count) return availableCourts.slice(0, count)

    const sorted = [...allCourts].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
    const availableIds = new Set(availableCourts.map((c) => c.id))
    const isAvailable = sorted.map((c) => availableIds.has(c.id))

    let bestIndices: number[] = []
    let bestScore = -1

    for (let start = 0; start <= sorted.length - count; start++) {
      const indices = Array.from({ length: count }, (_, i) => start + i)
      if (!indices.every((i) => isAvailable[i])) continue

      const leftBooked = start > 0 && !isAvailable[start - 1] ? 1 : 0
      const rightBooked = start + count < sorted.length && !isAvailable[start + count] ? 1 : 0
      const score = leftBooked + rightBooked

      if (score > bestScore) {
        bestScore = score
        bestIndices = indices
      }
    }

    return bestIndices.map((i) => sorted[i])
  }

  const handleSelectGuidedSlot = async(slot: { startTime: string; endTime: string; isSplit: boolean }) => {
    if (moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())) {
      setGuidedError(t('booking.pastTimeNotAllowed'))
      return
    }
    setGuidedSelectedSlot({ startTime: slot.startTime, endTime: slot.endTime })
    setGuidedSplitAssignment(null)
    setShowCourtPicker(false)
    setSearchingGuidedCourts(true)
    setGuidedError(null)

    try {
      if (!slot.isSplit) {
        // Standard slot: find courts available for the full duration
        const results = await Promise.all(
          filteredCourts.map(async(court) => {
            if (court.status !== 'active') return { court, available: false }
            const avail = await courtsService.getAvailability(court.id, selectedDate, requestedDurationMinutes)
            const ok = avail.slots.some((s) => s.startTime === slot.startTime && s.endTime === slot.endTime && s.available)
            return { court, available: ok }
          })
        )
        const available = results.filter((r) => r.available).map((r) => r.court)
        setGuidedAvailableCourts(available)
        setGuidedSelectedCourts(suggestCourts(filteredCourts, available, requestedCourtCount))
      } else {
        // Split slot: assign different courts per sub-slot
        const numSubSlots = slotDurationMinutes > 0 ? Math.round(requestedDurationMinutes / slotDurationMinutes) : 1
        const subStarts = Array.from({ length: numSubSlots }, (_, i) => addMinutes(slot.startTime, i * slotDurationMinutes))
        const activeCourts = filteredCourts.filter((c) => c.status === 'active')
        const stepFetched = await Promise.all(
          activeCourts.map((c) => courtsService.getAvailability(c.id, selectedDate, slotDurationMinutes))
        )
        const courtStepAvail = activeCourts.map((court, i) => ({
          court,
          availableSteps: new Set(stepFetched[i].slots.filter((s) => s.available).map((s) => s.startTime)),
        }))
        // Greedily assign courts per sub-slot, preferring to reuse the same court
        const assignment: { court: Court; startTime: string; endTime: string }[] = []
        let prevCourtIds = new Set<string>()
        for (const subStart of subStarts) {
          const subEnd = addMinutes(subStart, slotDurationMinutes)
          const available = courtStepAvail.filter(({ availableSteps }) => availableSteps.has(subStart))
          const preferred = available.filter(({ court }) => prevCourtIds.has(String(court.id)))
          const ordered = [...preferred, ...available.filter(({ court }) => !prevCourtIds.has(String(court.id)))]
          const selected = ordered.slice(0, requestedCourtCount)
          selected.forEach(({ court }) => assignment.push({ court, startTime: subStart, endTime: subEnd }))
          prevCourtIds = new Set(selected.map(({ court }) => String(court.id)))
        }
        setGuidedSplitAssignment(assignment)
        setGuidedAvailableCourts([])
        setGuidedSelectedCourts([])
      }
    } catch (err) {
      setGuidedError(err instanceof Error ? err.message : 'Failed to check availability')
    } finally {
      setSearchingGuidedCourts(false)
    }
  }

  const handleToggleGuidedCourt = (court: Court) => {
    setGuidedSelectedCourts((prev) => {
      const isSelected = prev.some((c) => c.id === court.id)
      if (isSelected) return prev.filter((c) => c.id !== court.id)
      if (prev.length >= requestedCourtCount) return prev
      return [...prev, court]
    })
  }

  // ── Free mode effects & handlers ───────────────────────────────────────────
  useEffect(() => {
    const loadFree = async() => {
      if (!selectedDate || filteredCourts.length === 0) {
        setFreeAvailability([])
        return
      }

      setLoadingFree(true)
      setFreeError(null)
      setFreeAvailability([])
      setSelectedCells(new Map())

      try {
        const activeCourts = filteredCourts.filter((c) => c.status === 'active')
        const fetched = await Promise.all(
          activeCourts.map((c) => courtsService.getAvailability(c.id, selectedDate, slotDurationMinutes))
        )
        setFreeAvailability(fetched)
      } catch (err) {
        setFreeError(err instanceof Error ? err.message : 'Failed to load availability')
        setFreeAvailability([])
      } finally {
        setLoadingFree(false)
      }
    }

    loadFree()
  }, [selectedDate, filteredCourts, slotDurationMinutes])

  const handleCellClick = (startTime: string, court: Court) => {
    if (moment(`${selectedDate} ${startTime}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())) {
      setFreeError(t('booking.pastTimeNotAllowed'))
      return
    }
    setFreeError(null)
    setSelectedCells((prev) => {
      const next = new Map(prev)
      const courtTimes = new Set(next.get(court.id) ?? [])
      if (courtTimes.has(startTime)) {
        courtTimes.delete(startTime)
      } else {
        courtTimes.add(startTime)
      }
      if (courtTimes.size === 0) next.delete(court.id)
      else next.set(court.id, courtTimes)
      return next
    })
  }

  const handleModeChange = (_: React.SyntheticEvent, newMode: 'guided' | 'free') => {
    setBookingMode(newMode)
    setGuidedSelectedSlot(null)
    setGuidedAvailableCourts([])
    setGuidedSelectedCourts([])
    setGuidedSplitAssignment(null)
    setGuidedError(null)
    setSelectedCells(new Map())
    setFreeError(null)
  }

  if (loading) {
    return (
      <Layout>
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: '#80644f' }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Sign-in nudge banner for unauthenticated visitors */}
      {!currentUser && !bannerDismissed && (
        <Box sx={{ bgcolor: '#f5efe8', borderBottom: '1px solid #e8d8c8', px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            🎾 Sign in to book faster, track your courts, and skip guest details every time.
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setLoginModalOpen(true)} sx={{ borderColor: '#80644f', color: '#80644f', fontWeight: 700, '&:hover': { borderColor: '#695241', bgcolor: 'transparent' } }}>
            Sign In
          </Button>
          <Button size="small" href="/register" sx={{ color: '#80644f', fontWeight: 700 }}>
            Create Account
          </Button>
          <IconButton size="small" onClick={() => setBannerDismissed(true)} sx={{ ml: 'auto', color: 'text.secondary' }}>
            {'\u00D7'}
          </IconButton>
        </Box>
      )}
      {venue && (
        <Box sx={{ width: '100vw', ml: 'calc(50% - 50vw)', backgroundColor: '#80644f' }}>
          <Container maxWidth="xl" sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            <Box
              component="section"
              sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Avatar
                src={venue.logo || '/avatar.png'}
                alt={venue.name.en || venue.name.th}
                sx={{ width: 200, height: 200 }}
              >
                <SportsTennisIcon sx={{ fontSize: 80 }} />
              </Avatar>
            </Box>
            <Box
              component="section"
              sx={{ p: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' }, justifyContent: 'center' }}
            >
              <div className="text-gray-200">
                <h1 className="text-2xl">{venue.name.en || venue.name.th}</h1>
                <Box sx={{ pt: 1 }}>
                  {venue.name.th && venue.name.en && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>{venue.name.th}</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                    <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
                    <Typography>{venue.address}</Typography>
                  </Box>
                </Box>
              </div>
              <Box sx={{ pt: 3 }}>
                <Button
                  href="#booking"
                  variant="contained"
                  size="large"
                  sx={{ borderRadius: 5, backgroundColor: '#ff7961' }}
                >
                  Book a Court
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>
      )}

      {/* ── Venue Details Section ────────────────────────────── */}
      {venue && (
        <Box sx={{ width: '100vw', ml: 'calc(50% - 50vw)', bgcolor: '#faf7f5', borderBottom: '1px solid #e8d8c8' }}>
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Grid container spacing={3}>
              {/* Map */}
              {venue.location?.coordinates && (
                <Grid item xs={12} md={venue.coverImage ? 4 : 6} sx={{ order: { xs: 0, md: 3 } }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#80644f', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                    Location
                  </Typography>
                  <Box
                    component="iframe"
                    src={`https://www.google.com/maps?q=${venue.location.coordinates[1]},${venue.location.coordinates[0]}&z=15&output=embed`}
                    sx={{ width: '100%', height: { xs: 120, md: 220 }, border: 'none', borderRadius: 2 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Venue location"
                  />
                </Grid>
              )}

              {/* Opening Hours */}
              <Grid item xs={12} md={venue.coverImage ? 4 : venue.location?.coordinates ? 6 : 12} sx={{ order: { xs: 1, md: 1 } }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#80644f', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                  Opening Hours
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const).map((dayName, i) => {
                    const schedule = venue.weeklySchedule[String(i)]
                    const todayIndex = new Date().getDay()
                    const isToday = i === todayIndex
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          px: 1, py: 0.4, borderRadius: 1,
                          bgcolor: isToday ? 'rgba(128,100,79,0.12)' : 'transparent',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: isToday ? 700 : 400, color: isToday ? '#80644f' : 'text.primary', minWidth: 90 }}>
                          {dayName}{isToday ? ' (Today)' : ''}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: isToday ? 700 : 400, color: schedule ? (isToday ? '#80644f' : 'text.primary') : 'text.disabled' }}>
                          {schedule ? `${schedule.open} – ${schedule.close}` : 'Closed'}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Grid>

              {/* Cover Image / Gallery */}
              {venue.coverImage && (
                <Grid item xs={12} md={4} sx={{ order: { xs: 2, md: 2 } }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#80644f', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                    Photos
                  </Typography>
                  <Box
                    component="img"
                    src={venue.coverImage}
                    alt={venue.name.en || venue.name.th}
                    sx={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 2, display: 'block' }}
                  />
                </Grid>
              )}

              {/* Facilities */}
              {venue.facilities && venue.facilities.length > 0 && (
                <Grid item xs={12} sx={{ order: { xs: 3, md: 4 } }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#80644f', mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                    Facilities
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {venue.facilities.map((f) => (
                      <Chip key={f} label={f} size="small" variant="outlined" sx={{ borderColor: '#c4a882', color: '#80644f' }} />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Container>
        </Box>
      )}

      <Box id="booking" sx={{ bgcolor: '#fff', minHeight: '60vh' }}>
        <Container maxWidth="lg" sx={{ pt: 3, pb: (bookingMode === 'free' && freeSelectedCourts.length > 0) || (bookingMode === 'guided' && guidedSelectedSlot && (guidedSelectedCourts.length > 0 || guidedSplitAssignment !== null)) ? 12 : 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* ── Controls card ─────────────────────────────────────── */}
          <Box
            sx={{
              bgcolor: '#fff',
              border: '1px solid #D4B8A0',
              borderRadius: 2,
              px: { xs: 2, md: 3 },
              py: 2,
              mb: 3,
            }}
          >
            {/* Row 1 (all screens): date picker + toggle */}
            <Box sx={{ mb: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <IconButton
                  size="small"
                  onClick={() => setSelectedDate(moment(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))}
                  disabled={moment(selectedDate).subtract(1, 'day').isBefore(moment(), 'day')}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <TextField
                  size="small"
                  label={t('booking.date')}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  sx={{ width: { xs: 130, sm: 160 } }}
                  inputProps={{ min: moment().format('YYYY-MM-DD') }}
                />
                <IconButton size="small" onClick={() => setSelectedDate(moment(selectedDate).add(1, 'day').format('YYYY-MM-DD'))}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Court count + hours — desktop only (inline) */}
              {bookingMode === 'guided' && (
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => setRequestedCourtCount((v) => Math.max(1, v - 1))} disabled={requestedCourtCount <= 1}>
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      size="small"
                      label={t('booking.numberOfCourts')}
                      type="number"
                      value={requestedCourtCount}
                      onChange={(e) => setRequestedCourtCount(Math.max(1, Number(e.target.value) || 1))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1, style: { textAlign: 'center' } }}
                    />
                    <IconButton size="small" onClick={() => setRequestedCourtCount((v) => v + 1)}>
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => setRequestedHours((v) => Math.max(1, v - 1))} disabled={requestedHours <= 1}>
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      size="small"
                      label={t('booking.numberOfHours')}
                      type="number"
                      value={requestedHours}
                      onChange={(e) => setRequestedHours(Math.max(1, Number(e.target.value) || 1))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1, style: { textAlign: 'center' } }}
                    />
                    <IconButton size="small" onClick={() => setRequestedHours((v) => v + 1)}>
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* Court type filter — desktop inline (between hours and toggle) */}
              {courtTypes.length > 1 && (
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.75 }}>
                  <Chip
                    label="All"
                    size="small"
                    onClick={() => setCourtTypeFilter(null)}
                    sx={courtTypeFilter === null ? { bgcolor: '#80644f', color: '#fff' } : {}}
                  />
                  {courtTypes.map((type) => (
                    <Chip
                      key={type}
                      label={type.charAt(0).toUpperCase() + type.slice(1)}
                      size="small"
                      onClick={() => setCourtTypeFilter(type === courtTypeFilter ? null : type)}
                      sx={courtTypeFilter === type ? { bgcolor: '#80644f', color: '#fff' } : {}}
                    />
                  ))}
                </Box>
              )}

              {/* Mode toggle — right-aligned, compact */}
              <ToggleButtonGroup
                value={bookingMode}
                exclusive
                onChange={(_e, val) => { if (val) handleModeChange(_e, val) }}
                size="small"
                sx={{
                  ml: 'auto',
                  flexShrink: 0,
                  '& .MuiToggleButton-root': {
                    textTransform: 'none', fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    px: { xs: 1, sm: 2 },
                    py: 0.5,
                    color: '#695241', border: '1px solid #D4B8A0',
                    whiteSpace: 'nowrap',
                  },
                  '& .Mui-selected': {
                    bgcolor: '#80644f !important', color: '#fff !important',
                    borderColor: '#80644f !important',
                  },
                }}
              >
                <ToggleButton value="guided">{t('booking.modeGuided')}</ToggleButton>
                <ToggleButton value="free">{t('booking.modeFree')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Row 2 (mobile only): court count + hours */}
            {bookingMode === 'guided' && (
              <Box sx={{ mt: 2, display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => setRequestedCourtCount((v) => Math.max(1, v - 1))} disabled={requestedCourtCount <= 1}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    label={t('booking.numberOfCourts')}
                    type="number"
                    value={requestedCourtCount}
                    onChange={(e) => setRequestedCourtCount(Math.max(1, Number(e.target.value) || 1))}
                    sx={{ width: 100 }}
                    inputProps={{ min: 1, style: { textAlign: 'center' } }}
                  />
                  <IconButton size="small" onClick={() => setRequestedCourtCount((v) => v + 1)}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => setRequestedHours((v) => Math.max(1, v - 1))} disabled={requestedHours <= 1}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    label={t('booking.numberOfHours')}
                    type="number"
                    value={requestedHours}
                    onChange={(e) => setRequestedHours(Math.max(1, Number(e.target.value) || 1))}
                    sx={{ width: 100 }}
                    inputProps={{ min: 1, style: { textAlign: 'center' } }}
                  />
                  <IconButton size="small" onClick={() => setRequestedHours((v) => v + 1)}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* Court type filter — mobile only */}
            {courtTypes.length > 1 && (
              <Box sx={{ mt: 2, display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Type:</Typography>
                <Chip
                  label="All"
                  size="small"
                  onClick={() => setCourtTypeFilter(null)}
                  sx={courtTypeFilter === null ? { bgcolor: '#80644f', color: '#fff' } : {}}
                />
                {courtTypes.map((type) => (
                  <Chip
                    key={type}
                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                    size="small"
                    onClick={() => setCourtTypeFilter(type === courtTypeFilter ? null : type)}
                    sx={courtTypeFilter === type ? { bgcolor: '#80644f', color: '#fff' } : {}}
                  />
                ))}
              </Box>
            )}

          </Box> {/* end controls card */}

          {/* ── GUIDED MODE ─────────────────────────────────────────────────── */}
          {bookingMode === 'guided' && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 16, color: '#80644f' }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#3D2200' }}>
                  {t('booking.availableSlots')}
                </Typography>
              </Box>

              {loadingGuided ? (
                <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box>
              ) : filteredGuidedSlots.length === 0 ? (
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f5efe8', border: '1px solid #e8d8c8', borderRadius: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#80644f', fontWeight: 600 }}>
                    {t('booking.noSlotsAvailable')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#80644f', mt: 0.5 }}>
                    Please choose a different date or time, or switch to{' '}
                    <Box
                      component="span"
                      onClick={() => handleModeChange({} as React.SyntheticEvent, 'free')}
                      sx={{ fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      Table view
                    </Box>
                    {' '}to see the full availability breakdown.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {filteredGuidedSlots.map((slot) => {
                    const isSelected = guidedSelectedSlot?.startTime === slot.startTime
                    return (
                      <Box
                        key={`${slot.startTime}-${slot.endTime}`}
                        onClick={() => handleSelectGuidedSlot(slot)}
                        sx={{
                          px: 2, py: 1,
                          borderRadius: 2,
                          border: `1px solid ${isSelected ? '#80644f' : '#D4B8A0'}`,
                          bgcolor: isSelected ? '#80644f' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          '&:hover': { borderColor: '#80644f', bgcolor: isSelected ? '#695241' : '#F5EDE4' },
                        }}
                      >
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#fff' : '#3D2200', lineHeight: 1.2 }}>
                          {slot.startTime} – {slot.endTime}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: isSelected ? 'rgba(255,255,255,0.75)' : '#9c795f', mt: 0.25 }}>
                          {slot.courtCount} court{slot.courtCount !== 1 ? 's' : ''}{slot.isSplit ? ' · courts change' : ''}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              )}

              {guidedError && (
                <Alert severity="error" sx={{ mb: 2 }}>{guidedError}</Alert>
              )}

              {guidedSelectedSlot && (
                <>
                  {searchingGuidedCourts ? (
                    <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box>
                  ) : guidedSplitAssignment !== null ? (
                    <Box sx={{ mb: 2 }}>
                      <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                        Courts will change each hour. You&apos;ll be assigned a different court per time slot.
                        {' '}Switch to{' '}
                        <Box
                          component="span"
                          onClick={() => handleModeChange({} as React.SyntheticEvent, 'free')}
                          sx={{ fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          Table view
                        </Box>
                        {' '}to see the full availability breakdown.
                      </Alert>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {guidedSplitAssignment.map(({ court, startTime, endTime }) => (
                          <Box
                            key={`${court.id}-${startTime}`}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, border: '1px solid #D4B8A0', borderRadius: 1.5, bgcolor: '#fafafa' }}
                          >
                            <Typography sx={{ fontSize: '0.78rem', color: '#9c795f', minWidth: 90 }}>{startTime} – {endTime}</Typography>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, flex: 1, color: '#3D2200' }}>{court.name}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#9c795f' }}>{fmtPrice(calcRangePrice(court, startTime, endTime))} {court.currency}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {showCourtPicker
                            ? `${t('booking.selectCourt')} (${guidedSelectedCourts.length}/${requestedCourtCount})`
                            : t('booking.selectedCourts')}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setShowCourtPicker((v) => !v)}
                          sx={{ color: '#695241', textTransform: 'none', fontWeight: 600 }}
                        >
                          {showCourtPicker ? t('action.done') : t('booking.changeCourts')}
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {(showCourtPicker ? guidedAvailableCourts : guidedSelectedCourts).map((c) => {
                          const isSelected = guidedSelectedCourts.some((s) => s.id === c.id)
                          const price = guidedSelectedSlot ? calcRangePrice(c, guidedSelectedSlot.startTime, guidedSelectedSlot.endTime) : 0
                          return (
                            <Box
                              key={String(c.id)}
                              onClick={showCourtPicker ? () => handleToggleGuidedCourt(c) : undefined}
                              sx={{
                                px: 2, py: 1,
                                borderRadius: 2,
                                border: `1px solid ${isSelected ? '#80644f' : '#D4B8A0'}`,
                                bgcolor: isSelected ? '#80644f' : '#fff',
                                cursor: showCourtPicker ? 'pointer' : 'default',
                                transition: 'all 0.15s',
                                ...(showCourtPicker && { '&:hover': { borderColor: '#80644f', bgcolor: isSelected ? '#695241' : '#F5EDE4' } }),
                              }}
                            >
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#fff' : '#3D2200', lineHeight: 1.2 }}>
                                {c.name}
                              </Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: isSelected ? 'rgba(255,255,255,0.75)' : '#9c795f', mt: 0.25 }}>
                                {fmtPrice(price)} {c.currency}
                              </Typography>
                            </Box>
                          )
                        })}
                      </Box>
                    </Box>
                  )}
                </>
              )}



              {(guidedSplitAssignment !== null || guidedSelectedCourts.length === requestedCourtCount) && guidedSelectedSlot && venue && (
                <CourtBookingModal
                  open={showBookingModal}
                  onClose={() => setShowBookingModal(false)}
                  courts={guidedSplitAssignment
                    ? [...new Map(guidedSplitAssignment.map(({ court }) => [String(court.id), court])).values()]
                    : guidedSelectedCourts}
                  venue={venue}
                  bookingItems={guidedSplitAssignment
                    ? guidedSplitAssignment.map(({ court, startTime, endTime }) => ({ courtID: court.id, date: selectedDate, startTime, endTime }))
                    : guidedSelectedCourts.map((court) => ({
                      courtID: court.id,
                      date: selectedDate,
                      startTime: guidedSelectedSlot.startTime,
                      endTime: guidedSelectedSlot.endTime,
                    }))}
                  onBookingComplete={handleBookingComplete}
                />
              )}
            </Box>
          )}

          {/* ── FREE MODE ───────────────────────────────────────────────────── */}
          {bookingMode === 'free' && (
            <Box>
              {freeError && (
                <Alert severity="error" sx={{ mb: 2 }}>{freeError}</Alert>
              )}

              <CourtAvailabilityTable
                courts={filteredCourts.filter((c) => c.status === 'active')}
                availabilityByCourt={freeAvailability}
                selectedDate={selectedDate}
                slotDurationMinutes={slotDurationMinutes}
                selectedCells={selectedCells}
                onCellClick={handleCellClick}
                loading={loadingFree}
              />

              {freeSelectionValidation.error && (
                <Alert severity="warning" sx={{ mt: 2 }}>{freeSelectionValidation.error}</Alert>
              )}

              {freeSelectionValidation.valid && venue && (
                <CourtBookingModal
                  open={showBookingModal}
                  onClose={() => setShowBookingModal(false)}
                  courts={freeSelectedCourts}
                  venue={venue}
                  bookingItems={freeBookingItems}
                  onBookingComplete={handleBookingComplete}
                />
              )}
            </Box>
          )}
        </Container>
      </Box>

      {/* Floating summary bar — guided mode */}
      {bookingMode === 'guided' && guidedSelectedSlot && (guidedSelectedCourts.length > 0 || guidedSplitAssignment !== null) && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)', left: { xs: 8, md: 24 }, right: { xs: 8, md: 24 }, zIndex: 100,
            borderRadius: 2.5, border: '1px solid #D4B8A0', bgcolor: '#fff',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: 3, bgcolor: '#80644f' }} />
          <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setShowGuidedDrawer(true)}>
              <Typography variant="caption" sx={{ color: '#9c795f', lineHeight: 1, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                tap for details
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#2D1800', mt: 0.5, lineHeight: 1.1 }}>
                {fmtPrice(guidedTotalPrice)}
                <Typography component="span" variant="body2" sx={{ color: '#9c795f', fontWeight: 600, ml: 0.75 }}>{guidedCurrency}</Typography>
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              sx={{ borderColor: '#D4B8A0', color: '#695241', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#80644f' } }}
              onClick={() => { setGuidedSelectedCourts([]); setGuidedSelectedSlot(null); setGuidedAvailableCourts([]); setGuidedSplitAssignment(null); setShowCourtPicker(false) }}
            >
              {t('booking.clearSelection')}
            </Button>
            <Button
              variant="contained"
              size="medium"
              disabled={!guidedSplitAssignment && guidedSelectedCourts.length !== requestedCourtCount}
              sx={{ bgcolor: '#80644f', textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#695241' } }}
              onClick={() => setShowBookingModal(true)}
            >
              {t('booking.proceedToBooking')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Floating selection summary bar for free mode — sits above the 56px bottom nav */}
      {bookingMode === 'free' && freeSelectedCourts.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)', left: { xs: 8, md: 24 }, right: { xs: 8, md: 24 }, zIndex: 100,
            borderRadius: 2.5, border: '1px solid #D4B8A0', bgcolor: '#fff',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: 3, bgcolor: '#80644f' }} />
          <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setShowSelectionDrawer(true)}>
              <Typography variant="caption" sx={{ color: '#9c795f', lineHeight: 1, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                tap for details
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#2D1800', mt: 0.5, lineHeight: 1.1 }}>
                {fmtPrice(freeTotalPrice)}
                <Typography component="span" variant="body2" sx={{ color: '#9c795f', fontWeight: 600, ml: 0.75 }}>{freeCurrency}</Typography>
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              sx={{ borderColor: '#D4B8A0', color: '#695241', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#80644f' } }}
              onClick={() => setSelectedCells(new Map())}
            >
              {t('booking.clearSelection')}
            </Button>
            <Button
              variant="contained"
              size="medium"
              sx={{ bgcolor: '#80644f', textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#695241' } }}
              onClick={() => setShowBookingModal(true)}
            >
              {t('booking.proceedToBooking')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Guided mode detail drawer */}
      <Drawer
        anchor="bottom"
        open={showGuidedDrawer}
        onClose={() => setShowGuidedDrawer(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', pb: 'env(safe-area-inset-bottom, 0px)' } }}
      >
        <Box sx={{ px: 3, pt: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>{t('booking.selectedCourts')}</Typography>
          <Button size="small" onClick={() => setShowGuidedDrawer(false)}>Close</Button>
        </Box>
        <Divider />
        {guidedSelectedSlot && (
          <List dense sx={{ overflowY: 'auto' }}>
            {guidedSplitAssignment !== null
              ? guidedSplitAssignment.map(({ court, startTime, endTime }) => {
                const price = calcRangePrice(court, startTime, endTime)
                return (
                  <ListItem key={`${court.id}-${startTime}`} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5, gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>{court.name}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body2" color="text.secondary">{startTime} – {endTime}</Typography>
                      <Typography variant="body2" color="text.secondary">{fmtPrice(price)} {court.currency}</Typography>
                    </Box>
                  </ListItem>
                )
              })
              : guidedSelectedCourts.map((court) => {
                const price = calcRangePrice(court, guidedSelectedSlot.startTime, guidedSelectedSlot.endTime)
                return (
                  <ListItem key={court.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5, gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>{court.name}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body2" color="text.secondary">
                        {guidedSelectedSlot.startTime} – {guidedSelectedSlot.endTime}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtPrice(price)} {court.currency}
                      </Typography>
                    </Box>
                  </ListItem>
                )
              })}
          </List>
        )}
        <Divider />
        <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
            Total: {fmtPrice(guidedTotalPrice)} {guidedCurrency}
          </Typography>
          <Button variant="outlined" onClick={() => { setGuidedSelectedCourts([]); setGuidedSelectedSlot(null); setGuidedAvailableCourts([]); setGuidedSplitAssignment(null); setShowCourtPicker(false); setShowGuidedDrawer(false) }} color="error" size="small">
            {t('booking.clearSelection')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!guidedSplitAssignment && guidedSelectedCourts.length !== requestedCourtCount}
            onClick={() => { setShowGuidedDrawer(false); setShowBookingModal(true) }}
          >
            {t('booking.proceedToBooking')}
          </Button>
        </Box>
      </Drawer>

      {/* Selection detail drawer */}
      <Drawer
        anchor="bottom"
        open={showSelectionDrawer}
        onClose={() => setShowSelectionDrawer(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh', pb: 'env(safe-area-inset-bottom, 0px)' } }}
      >
        <Box sx={{ px: 3, pt: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>{t('booking.selectedCourts')}</Typography>
          <Button size="small" onClick={() => setShowSelectionDrawer(false)}>Close</Button>
        </Box>
        <Divider />
        <List dense sx={{ overflowY: 'auto' }}>
          {freeSelectedCourts.map((court) => {
            const times = Array.from(selectedCells.get(court.id) ?? []).sort()
            const ranges = mergeSlots(times)
            return (
              <ListItem key={court.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5, gap: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>{court.name}</Typography>
                {ranges.map((r) => {
                  const price = calcRangePrice(court, r.startTime, r.endTime)
                  return (
                    <Box key={r.startTime} sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body2" color="text.secondary">
                        {r.startTime} – {r.endTime}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtPrice(price)} {court.currency}
                      </Typography>
                    </Box>
                  )
                })}
              </ListItem>
            )
          })}
        </List>
        <Divider />
        <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
            Total: {fmtPrice(freeTotalPrice)} {freeCurrency}
          </Typography>
          <Button variant="outlined" onClick={() => { setSelectedCells(new Map()); setShowSelectionDrawer(false) }} color="error" size="small">
            {t('booking.clearSelection')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => { setShowSelectionDrawer(false); setShowBookingModal(true) }}
          >
            {t('booking.proceedToBooking')}
          </Button>
        </Box>
      </Drawer>

      <Dialog
        open={Boolean(bookingSuccessMsg)}
        onClose={() => setBookingSuccessMsg(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <Box sx={{ fontSize: 48, lineHeight: 1, mb: 1 }}>🎉</Box>
          Thank you for your booking!
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please check your email for payment instructions and upload your payment slip to confirm the booking.
          </Typography>
          <Box sx={{ bgcolor: 'warning.light', borderRadius: 1.5, px: 2, py: 1.5, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
              ⏱ Please complete payment within 10 minutes or your booking will be automatically cancelled.
            </Typography>
          </Box>
          <Box sx={{ bgcolor: '#f5efe8', borderRadius: 1.5, px: 2, py: 1.5, border: '1px solid #e8d8c8' }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
              Track your bookings more easily!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Create a free account to view all your bookings, skip guest details next time, and get notified instantly.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button
                size="small"
                variant="contained"
                href="/register"
                sx={{ bgcolor: '#80644f', '&:hover': { bgcolor: '#695241' } }}
              >
                Create Account
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setBookingSuccessMsg(null); setLoginModalOpen(true) }}
                sx={{ borderColor: '#80644f', color: '#80644f' }}
              >
                Sign In
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={() => setBookingSuccessMsg(null)}
            sx={{ bgcolor: '#80644f', '&:hover': { bgcolor: '#695241' }, px: 4 }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <LoginModal visible={loginModalOpen} setVisible={setLoginModalOpen} />
    </Layout>
  )
}
