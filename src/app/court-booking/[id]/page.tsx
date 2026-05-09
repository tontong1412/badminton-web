'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Avatar,
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Tab,
  Tabs,
  Stack,
  Grid,
  Chip,
} from '@mui/material'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import { BookingAvailability, Court, Venue } from '@/type'
import venueService from '../../services/venues'
import courtsService from '../../services/courts'
import CourtSelection from '../../components/CourtSelection'
import CourtBookingModal from '../../components/CourtBookingModal'
import CourtAvailabilityTable from '../../components/CourtAvailabilityTable'
import Layout from '../../components/Layout'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

export default function VenueCourtsPage() {
  const { t } = useTranslation()
  const params = useParams()
  const venueId = params.id as string

  const [venue, setVenue] = useState<Venue | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  const [bookingMode, setBookingMode] = useState<'guided' | 'free'>('guided')
  const [showBookingModal, setShowBookingModal] = useState(false)

  const slotDurationMinutes = venue?.slotDurationMinutes ?? 30

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
  const [guidedAvailability, setGuidedAvailability] = useState<BookingAvailability[]>([])
  const [guidedSlots, setGuidedSlots] = useState<{ startTime: string; endTime: string; courtCount: number }[]>([])
  const [guidedSelectedSlot, setGuidedSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [guidedAvailableCourts, setGuidedAvailableCourts] = useState<Court[]>([])
  const [guidedSelectedCourts, setGuidedSelectedCourts] = useState<Court[]>([])
  const [loadingGuided, setLoadingGuided] = useState(false)
  const [searchingGuidedCourts, setSearchingGuidedCourts] = useState(false)
  const [guidedError, setGuidedError] = useState<string | null>(null)

  const requestedDurationMinutes = requestedHours * 60

  // ── Free mode state ────────────────────────────────────────────────────────
  const [freeAvailability, setFreeAvailability] = useState<BookingAvailability[]>([])
  const [selectedCells, setSelectedCells] = useState<Map<string, Set<string>>>(new Map())
  const [loadingFree, setLoadingFree] = useState(false)
  const [freeError, setFreeError] = useState<string | null>(null)

  const freeSelectedCourts = courts.filter((c) => (selectedCells.get(c.id)?.size ?? 0) > 0)

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

  const freeSelectionValidation = (() => {
    if (selectedCells.size === 0) return { valid: false, error: null }
    return { valid: true, error: null }
  })()

  useEffect(() => {
    const loadData = async() => {
      try {
        setLoading(true)
        const [venueData, allCourts] = await Promise.all([
          venueService.getById(venueId),
          courtsService.getAll(),
        ])

        setVenue(venueData)
        // Filter courts for this venue
        const venueCourts = allCourts.filter((c) => c.venueID === venueId)
        setCourts(venueCourts)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load venue or courts'
        setError(message)
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (venueId) {
      loadData()
    }
  }, [venueId])

  const handleBookingComplete = () => {
    setShowBookingModal(false)
    setGuidedSelectedCourts([])
    setGuidedSelectedSlot(null)
    setGuidedAvailableCourts([])
    setSelectedCells(new Map())
  }

  // ── Guided mode effects & handlers ─────────────────────────────────────────
  useEffect(() => {
    const loadGuided = async() => {
      if (!selectedDate || courts.length === 0) {
        setGuidedSlots([])
        return
      }

      setLoadingGuided(true)
      setGuidedError(null)
      setGuidedAvailability([])
      setGuidedSlots([])
      setGuidedSelectedSlot(null)
      setGuidedAvailableCourts([])
      setGuidedSelectedCourts([])

      try {
        const activeCourts = courts.filter((c) => c.status === 'active')
        const fetched = await Promise.all(
          activeCourts.map((c) => courtsService.getAvailability(c.id, selectedDate, requestedDurationMinutes))
        )
        setGuidedAvailability(fetched)

        const slotCount = new Map<string, { startTime: string; endTime: string; courtCount: number }>()
        fetched.forEach((avail) => {
          avail.slots.forEach((slot) => {
            if (!slot.available) return
            if (moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())) return
            const key = `${slot.startTime}-${slot.endTime}`
            const existing = slotCount.get(key)
            if (existing) {
              existing.courtCount += 1
            } else {
              slotCount.set(key, { startTime: slot.startTime, endTime: slot.endTime, courtCount: 1 })
            }
          })
        })
        setGuidedSlots(
          Array.from(slotCount.values())
            .filter((s) => s.courtCount >= requestedCourtCount)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
        )
      } catch (err) {
        setGuidedError(err instanceof Error ? err.message : 'Failed to load slots')
        setGuidedSlots([])
      } finally {
        setLoadingGuided(false)
      }
    }

    if (bookingMode === 'guided') loadGuided()
  }, [selectedDate, courts, requestedDurationMinutes, requestedCourtCount, bookingMode])

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

  const handleSelectGuidedSlot = async(slot: { startTime: string; endTime: string }) => {
    if (moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())) {
      setGuidedError(t('booking.pastTimeNotAllowed'))
      return
    }
    setGuidedSelectedSlot(slot)
    setGuidedSelectedCourts([])
    setSearchingGuidedCourts(true)
    setGuidedError(null)

    try {
      const results = await Promise.all(
        courts.map(async(court) => {
          if (court.status !== 'active') return { court, available: false }
          const avail = await courtsService.getAvailability(court.id, selectedDate, requestedDurationMinutes)
          const ok = avail.slots.some((s) => s.startTime === slot.startTime && s.endTime === slot.endTime && s.available)
          return { court, available: ok }
        })
      )
      const available = results.filter((r) => r.available).map((r) => r.court)
      setGuidedAvailableCourts(available)
      setGuidedSelectedCourts(suggestCourts(courts, available, requestedCourtCount))
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
      if (!selectedDate || courts.length === 0) {
        setFreeAvailability([])
        return
      }

      setLoadingFree(true)
      setFreeError(null)
      setFreeAvailability([])
      setSelectedCells(new Map())

      try {
        const activeCourts = courts.filter((c) => c.status === 'active')
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

    if (bookingMode === 'free') loadFree()
  }, [selectedDate, courts, slotDurationMinutes, bookingMode])

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
    setGuidedError(null)
    setSelectedCells(new Map())
    setFreeError(null)
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
      {venue && (
        <Box sx={{ width: '100vw', ml: 'calc(50% - 50vw)', backgroundColor: '#80644f', mb: 2 }}>
          <Container maxWidth="lg" sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            <Box
              component="section"
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Avatar sx={{ width: 160, height: 160, bgcolor: '#ff7961' }}>
                <SportsTennisIcon sx={{ fontSize: 80 }} />
              </Avatar>
            </Box>

            <Box
              component="section"
              sx={{
                p: 2,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'center', md: 'flex-start' },
                justifyContent: 'center',
                color: 'grey.200',
              }}
            >
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                {venue.name.en || venue.name.th}
              </Typography>
              {venue.name.th && venue.name.en && (
                <Typography variant="h6" sx={{ mt: 1 }}>
                  {venue.name.th}
                </Typography>
              )}
              <Typography variant="body1" sx={{ mt: 1 }}>
                {venue.address}
              </Typography>
            </Box>
          </Container>
        </Box>
      )}

      <Container maxWidth="lg" sx={{ pt: 1, pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Shared date picker */}
        <Box sx={{ mb: 3 }}>
          <TextField
            size="small"
            label={t('booking.date')}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ maxWidth: 260 }}
          />
        </Box>

        {/* Mode tabs */}
        <Tabs value={bookingMode} onChange={handleModeChange} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="guided" label={t('booking.modeGuided')} />
          <Tab value="free" label={t('booking.modeFree')} />
        </Tabs>

        {/* ── GUIDED MODE ─────────────────────────────────────────────────── */}
        {bookingMode === 'guided' && (
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                size="small"
                label={t('booking.numberOfCourts')}
                type="number"
                value={requestedCourtCount}
                onChange={(e) => setRequestedCourtCount(Math.max(1, Number(e.target.value) || 1))}
                sx={{ maxWidth: 220 }}
              />
              <TextField
                size="small"
                label={t('booking.numberOfHours')}
                type="number"
                value={requestedHours}
                onChange={(e) => setRequestedHours(Math.max(1, Number(e.target.value) || 1))}
                sx={{ maxWidth: 220 }}
              />
            </Stack>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t('booking.availableSlots')}
            </Typography>

            {loadingGuided ? (
              <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box>
            ) : guidedSlots.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>{t('booking.noSlotsAvailable')}</Alert>
            ) : (
              <Grid container spacing={1} sx={{ mb: 3 }}>
                {guidedSlots.map((slot) => (
                  <Grid item key={`${slot.startTime}-${slot.endTime}`}>
                    <Chip
                      label={`${slot.startTime} – ${slot.endTime} (${slot.courtCount})`}
                      color={guidedSelectedSlot?.startTime === slot.startTime ? 'primary' : 'default'}
                      variant={guidedSelectedSlot?.startTime === slot.startTime ? 'filled' : 'outlined'}
                      onClick={() => handleSelectGuidedSlot({ startTime: slot.startTime, endTime: slot.endTime })}
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            {guidedError && (
              <Alert severity="error" sx={{ mb: 2 }}>{guidedError}</Alert>
            )}

            {guidedSelectedSlot && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  {t('booking.selectCourt')}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {t('booking.selectedCourtsCount', {
                    selected: guidedSelectedCourts.length,
                    required: requestedCourtCount,
                  })}
                </Typography>
                <CourtSelection
                  courts={guidedAvailableCourts}
                  selectedCourtIds={guidedSelectedCourts.map((c) => c.id)}
                  onToggleCourt={handleToggleGuidedCourt}
                  maxSelectable={requestedCourtCount}
                  loading={searchingGuidedCourts}
                  error={null}
                  slotStartTime={guidedSelectedSlot?.startTime}
                  slotEndTime={guidedSelectedSlot?.endTime}
                />
              </>
            )}

            {guidedSelectedCourts.length === requestedCourtCount && requestedCourtCount > 0 && guidedSelectedSlot && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button variant="contained" color="primary" size="large" onClick={() => setShowBookingModal(true)}>
                  {t('booking.proceedToBooking')}
                </Button>
              </Box>
            )}

            {guidedSelectedCourts.length === requestedCourtCount && guidedSelectedSlot && venue && (
              <CourtBookingModal
                open={showBookingModal}
                onClose={() => setShowBookingModal(false)}
                courts={guidedSelectedCourts}
                venue={venue}
                preselectedSlot={{ date: selectedDate, startTime: guidedSelectedSlot.startTime, endTime: guidedSelectedSlot.endTime }}
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
              courts={courts.filter((c) => c.status === 'active')}
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

            {freeSelectedCourts.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {freeSelectedCourts.map((court) => {
                  const times = Array.from(selectedCells.get(court.id) ?? []).sort()
                  const ranges = mergeSlots(times)
                  return (
                    <Typography key={court.id} variant="body2">
                      <strong>{court.name}:</strong> {ranges.map((r) => `${r.startTime}–${r.endTime}`).join(', ')}
                    </Typography>
                  )
                })}
                <Box sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => setSelectedCells(new Map())}>
                    {t('booking.clearSelection')}
                  </Button>
                </Box>
              </Box>
            )}

            {freeSelectionValidation.valid && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button variant="contained" color="primary" size="large" onClick={() => setShowBookingModal(true)}>
                  {t('booking.proceedToBooking')}
                </Button>
              </Box>
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
    </Layout>
  )
}
