'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Breadcrumbs,
  TextField,
  Chip,
  Grid,
  Button,
  Stack,
} from '@mui/material'
import { Court, Venue } from '@/type'
import venueService from '../../services/venues'
import courtsService from '../../services/courts'
import CourtSelection from '../../components/CourtSelection'
import CourtBookingModal from '../../components/CourtBookingModal'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

export default function VenueCourtsPage() {
  const { t } = useTranslation()
  const params = useParams()
  const venueId = params.id as string

  const [venue, setVenue] = useState<Venue | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [availableCourts, setAvailableCourts] = useState<Court[]>([])
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string; courtCount: number }[]>([])
  const [selectedCourts, setSelectedCourts] = useState<Court[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchingAvailability, setSearchingAvailability] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  const [requestedCourtCount, setRequestedCourtCount] = useState(1)
  const [requestedHours, setRequestedHours] = useState(1)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [showBookingModal, setShowBookingModal] = useState(false)

  const requestedDurationMinutes = requestedHours * 60

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
    setSelectedCourts([])
  }

  const handleToggleCourt = (court: Court) => {
    setSelectedCourts((prev) => {
      const isSelected = prev.some((item) => item.id === court.id)

      if (isSelected) {
        return prev.filter((item) => item.id !== court.id)
      }

      if (prev.length >= requestedCourtCount) {
        return prev
      }

      return [...prev, court]
    })
  }

  const handleFindCourts = async(slotStartTime: string, slotEndTime: string) => {
    setSearchingAvailability(true)
    setAvailabilityError(null)
    setSelectedCourts([])

    try {
      const availabilityResults = await Promise.all(
        courts.map(async(court) => {
          if (court.status !== 'active') {
            return { court, available: false }
          }

          const availability = await courtsService.getAvailability(court.id, selectedDate, requestedDurationMinutes)
          const hasRequestedSlot = availability.slots.some((slot) =>
            slot.startTime === slotStartTime && slot.endTime === slotEndTime && slot.available
          )

          return { court, available: hasRequestedSlot }
        })
      )

      setAvailableCourts(availabilityResults.filter((item) => item.available).map((item) => item.court))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check availability'
      setAvailabilityError(message)
    } finally {
      setSearchingAvailability(false)
    }
  }

  useEffect(() => {
    const loadSlotsForDate = async() => {
      if (!selectedDate || courts.length === 0) {
        setAvailableSlots([])
        return
      }

      setLoadingSlots(true)
      setAvailabilityError(null)
      setAvailableCourts([])
      setSelectedCourts([])
      setSelectedSlot(null)
      setStartTime('')
      setEndTime('')

      try {
        const activeCourts = courts.filter((court) => court.status === 'active')
        const availabilityByCourt = await Promise.all(
          activeCourts.map((court) => courtsService.getAvailability(court.id, selectedDate, requestedDurationMinutes))
        )

        const slotCount = new Map<string, { startTime: string; endTime: string; courtCount: number }>()

        availabilityByCourt.forEach((availability) => {
          availability.slots.forEach((slot) => {
            if (!slot.available) {
              return
            }

            const slotStartAt = moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm')
            if (slotStartAt.isSameOrBefore(moment())) {
              return
            }

            const key = `${slot.startTime}-${slot.endTime}`
            const existing = slotCount.get(key)

            if (existing) {
              existing.courtCount += 1
            } else {
              slotCount.set(key, {
                startTime: slot.startTime,
                endTime: slot.endTime,
                courtCount: 1,
              })
            }
          })
        })

        const sortedSlots = Array.from(slotCount.values())
          .filter((slot) => slot.courtCount >= requestedCourtCount)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))

        setAvailableSlots(sortedSlots)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load available slots'
        setAvailabilityError(message)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlotsForDate()
  }, [selectedDate, courts, requestedDurationMinutes, requestedCourtCount])

  const handleSelectSlot = (slot: { startTime: string; endTime: string }) => {
    const slotStartAt = moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm')
    if (slotStartAt.isSameOrBefore(moment())) {
      setAvailabilityError(t('booking.pastTimeNotAllowed'))
      return
    }

    setSelectedSlot(slot)
    setStartTime(slot.startTime)
    setEndTime(slot.endTime)
    handleFindCourts(slot.startTime, slot.endTime)
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link href="/court-booking" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Typography color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
            {t('booking.venues')}
          </Typography>
        </Link>
        <Typography color="textPrimary">
          {venue?.name.en || venue?.name.th}
        </Typography>
      </Breadcrumbs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {venue && (
        <>
          <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold' }}>
            {venue.name.en || venue.name.th}
          </Typography>
          {venue.name.th && venue.name.en && (
            <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
              {venue.name.th}
            </Typography>
          )}
          <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
            {venue.address}
          </Typography>
        </>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('booking.selectDateTimeFirst')}
        </Typography>

        <TextField
          label={t('booking.date')}
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: moment().format('YYYY-MM-DD') }}
          sx={{ mb: 2, maxWidth: 260 }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label={t('booking.numberOfCourts')}
            type="number"
            value={requestedCourtCount}
            onChange={(e) => setRequestedCourtCount(Math.max(1, Number(e.target.value) || 1))}
            inputProps={{ min: 1, step: 1 }}
            sx={{ maxWidth: 220 }}
          />
          <TextField
            label={t('booking.numberOfHours')}
            type="number"
            value={requestedHours}
            onChange={(e) => setRequestedHours(Math.max(1, Number(e.target.value) || 1))}
            inputProps={{ min: 1, step: 1 }}
            sx={{ maxWidth: 220 }}
          />
        </Stack>

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t('booking.availableSlots')}
        </Typography>

        {loadingSlots ? (
          <Box sx={{ py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : availableSlots.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('booking.noSlotsAvailable')}
          </Alert>
        ) : (
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {availableSlots.map((slot) => (
              <Grid item key={`${slot.startTime}-${slot.endTime}`}>
                <Chip
                  label={`${slot.startTime} - ${slot.endTime} (${slot.courtCount})`}
                  color={selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime ? 'primary' : 'default'}
                  variant={selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime ? 'filled' : 'outlined'}
                  onClick={() => handleSelectSlot({ startTime: slot.startTime, endTime: slot.endTime })}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {availabilityError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {availabilityError}
          </Alert>
        )}

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {t('booking.selectCourt')}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {t('booking.selectedCourtsCount', {
            selected: selectedCourts.length,
            required: requestedCourtCount,
          })}
        </Typography>
        <CourtSelection
          courts={availableCourts}
          selectedCourtIds={selectedCourts.map((court) => court.id)}
          onToggleCourt={handleToggleCourt}
          maxSelectable={requestedCourtCount}
          loading={searchingAvailability}
          error={null}
        />
      </Box>

      {selectedCourts.length === requestedCourtCount && requestedCourtCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => setShowBookingModal(true)}
          >
            {t('booking.proceedToBooking')}
          </Button>
        </Box>
      )}

      {selectedCourts.length > 0 && venue && (
        <CourtBookingModal
          open={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          courts={selectedCourts}
          venue={venue}
          preselectedSlot={{ date: selectedDate, startTime, endTime }}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </Container>
  )
}
