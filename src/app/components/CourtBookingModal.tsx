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
} from '@mui/material'
import { Court, Venue } from '@/type'
import BookingAvailability from './BookingAvailability'
import Transition from './ModalTransition'
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
  onBookingComplete: () => void;
}

const steps = ['Select Time', 'Enter Details', 'Confirm Booking']

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
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setErrorState] = useState<string | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const isItemsPreselected = Boolean(bookingItems && bookingItems.length > 0)
  const isSlotPreselected = Boolean(preselectedSlot?.date && preselectedSlot?.startTime && preselectedSlot?.endTime)
  const isPreselected = isItemsPreselected || isSlotPreselected

  const handleSlotSelected = (date: string, start: string, end: string) => {
    setSelectedDate(date)
    setStartTime(start)
    setEndTime(end)
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
        const start = moment(item.startTime, 'HH:mm')
        const end = moment(item.endTime, 'HH:mm')
        const durationHours = end.diff(start, 'minutes') / 60
        return sum + durationHours * court.pricePerHour
      }, 0)
    }
    const durationHours = calculateDuration() / 60
    return courts.reduce((sum, court) => sum + (durationHours * court.pricePerHour), 0)
  }

  const handleNext = () => {
    if (activeStep === 0) {
      if (!isPreselected && (!selectedDate || !startTime || !endTime)) {
        setErrorState(t('booking.selectTimeSlotFirst'))
        return
      }

      if (!isItemsPreselected) {
        const bookingStartAt = moment(`${selectedDate} ${startTime}`, 'YYYY-MM-DD HH:mm')
        if (bookingStartAt.isSameOrBefore(moment())) {
          setErrorState(t('booking.pastTimeNotAllowed'))
          return
        }
      }
    } else if (activeStep === 1) {
      if (!currentUser && (!guestName || !guestPhone)) {
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
      onBookingComplete()

      // Reset form
      setSelectedDate('')
      setStartTime('')
      setEndTime('')
      setGuestName('')
      setGuestPhone('')
      setGuestEmail('')
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
                <StepLabel>{t(`booking.step${steps.indexOf(label) + 1}`)}</StepLabel>
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
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {t('booking.courts')}: {courts.map((court) => court.name).join(', ')}
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {t('booking.venue')}: {venue.name.en || venue.name.th}
              </Typography>
              {isItemsPreselected && bookingItems ? (
                <Box>
                  {bookingItems.map((item) => {
                    const court = courts.find((c) => c.id === item.courtID)
                    return (
                      <Typography key={`${item.courtID}-${item.startTime}`} variant="body2" sx={{ mb: 0.5 }}>
                        {court?.name ?? item.courtID}: {item.date} {item.startTime} – {item.endTime}
                      </Typography>
                    )
                  })}
                </Box>
              ) : isSlotPreselected ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('booking.selectedTimeSlot')}: {selectedDate} {startTime} - {endTime}
                </Alert>
              ) : (
                <BookingAvailability
                  court={courts[0]}
                  onSlotSelected={handleSlotSelected}
                />
              )}
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              {currentUser ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('booking.bookingAs')}: {currentUser.player.displayName.en || currentUser.player.displayName.th || currentUser.player.officialName.en || currentUser.email}
                </Alert>
              ) : (
                <>
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

          {activeStep === 2 && (
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
                    const price = court ? (durationMins / 60) * court.pricePerHour : 0
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
  )
}
