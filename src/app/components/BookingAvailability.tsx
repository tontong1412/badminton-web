'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Grid,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import { BookingAvailability, Court } from '@/type'
import courtsService from '../services/courts'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

interface BookingAvailabilityProps {
  court: Court;
  onSlotSelected: (date: string, startTime: string, endTime: string) => void;
  minDate?: string;
}

export default function BookingAvailabilityComponent({
  court,
  onSlotSelected,
  minDate,
}: BookingAvailabilityProps) {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState<string>(minDate || moment().format('YYYY-MM-DD'))
  const [availability, setAvailability] = useState<BookingAvailability | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAvailability = async() => {
      try {
        setLoading(true)
        const startDate = moment(selectedDate).format('YYYY-MM-DD')

        const availabilityData = await courtsService.getAvailability(court.id, startDate, 120)
        setAvailability(availabilityData)
        setSelectedSlot(null)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load availability'
        setError(message)
        console.error('Error loading availability:', err)
      } finally {
        setLoading(false)
      }
    }

    if (selectedDate) {
      loadAvailability()
    }
  }, [selectedDate, court.id])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
  }

  const handleSlotSelect = (slot: { startTime: string; endTime: string }) => {
    const slotStartAt = moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm')
    if (slotStartAt.isSameOrBefore(moment())) {
      setError(t('booking.pastTimeNotAllowed'))
      return
    }

    setSelectedSlot(slot)
    setError(null)
    onSlotSelected(selectedDate, slot.startTime, slot.endTime)
  }

  const visibleSlots = availability?.slots.filter((slot) => {
    const slotStartAt = moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm')
    return slotStartAt.isAfter(moment())
  }) || []

  const minDateStr = minDate || moment().format('YYYY-MM-DD')
  const maxDateStr = moment().add(90, 'days').format('YYYY-MM-DD')

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('booking.selectTimeSlot')}
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          inputProps={{
            min: minDateStr,
            max: maxDateStr,
          }}
          fullWidth
          label={t('booking.date')}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && availability && visibleSlots.length === 0 && (
        <Alert severity="warning">
          {t('booking.noSlotsAvailable')}
        </Alert>
      )}

      {!loading && availability && visibleSlots.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('booking.availableSlots')} ({visibleSlots.length})
          </Typography>
          <Grid container spacing={1}>
            {visibleSlots.map((slot, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Chip
                  label={`${slot.startTime} - ${slot.endTime}`}
                  onClick={() => handleSlotSelect(slot)}
                  color={
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.endTime === slot.endTime
                      ? 'primary'
                      : 'default'
                  }
                  variant={
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.endTime === slot.endTime
                      ? 'filled'
                      : 'outlined'
                  }
                  sx={{
                    width: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!loading && !availability && (
        <Alert severity="info">
          {t('booking.loadingSlots')}
        </Alert>
      )}
    </Box>
  )
}
