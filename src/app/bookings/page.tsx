'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
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
} from '@mui/material'
import { Booking, Court } from '@/type'
import bookingsService from '../../services/bookings'
import courtsService from '../../services/courts'
import { useAppDispatch } from '../../libs/redux/store'
import { setBookings, removeBooking, setError as setBookingError } from '../../libs/redux/slices/bookingSlice'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

export default function MyBookingsPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const [bookings, setBookingsState] = useState<Booking[]>([])
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const loadBookings = async() => {
      try {
        setLoading(true)
        const data = await bookingsService.getAll()
        setBookingsState(data)
        dispatch(setBookings(data))

        // Load court details for all bookings
        const courtIds = [...new Set(data.map((b) => b.courtID))]
        const courts: Record<string, Court> = {}

        for (const courtId of courtIds) {
          try {
            const court = await courtsService.getById(courtId)
            courts[courtId] = court
          } catch (err) {
            console.error(`Failed to load court ${courtId}:`, err)
          }
        }

        setCourtDetails(courts)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load bookings'
        setError(message)
        dispatch(setBookingError(message))
        console.error('Error loading bookings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [dispatch])

  const handleCancelClick = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async() => {
    if (!selectedBookingId) return

    try {
      setCancelling(true)
      await bookingsService.cancel(selectedBookingId)
      setBookingsState(bookings.filter((b) => b.id !== selectedBookingId))
      dispatch(removeBooking(selectedBookingId))
      setCancelDialogOpen(false)
      setSelectedBookingId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel booking'
      setError(message)
      console.error('Error canceling booking:', err)
    } finally {
      setCancelling(false)
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
        {t('booking.myBookings')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {bookings.length === 0 ? (
        <Alert severity="info">
          {t('booking.noBookingsFound')}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>{t('booking.court')}</TableCell>
                <TableCell>{t('booking.date')}</TableCell>
                <TableCell>{t('booking.time')}</TableCell>
                <TableCell>{t('booking.price')}</TableCell>
                <TableCell>{t('booking.status')}</TableCell>
                <TableCell>{t('booking.paymentStatus')}</TableCell>
                <TableCell align="right">{t('booking.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id} hover>
                  <TableCell>
                    {courtDetails[booking.courtID]?.name || 'Loading...'}
                  </TableCell>
                  <TableCell>
                    {moment(booking.date).format('DD/MM/YYYY')}
                  </TableCell>
                  <TableCell>
                    {booking.startTime} - {booking.endTime}
                  </TableCell>
                  <TableCell>
                    {booking.totalPrice.toFixed(2)} {booking.currency}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status}
                      size="small"
                      color={getStatusColor(booking.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.paymentStatus}
                      size="small"
                      color={getPaymentStatusColor(booking.paymentStatus) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {booking.status === 'confirmed' && (
                      <>
                        {moment(booking.date).isAfter(moment()) && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleCancelClick(booking.id)}
                          >
                            {t('booking.cancel')}
                          </Button>
                        )}
                        {booking.paymentStatus === 'unpaid' && (
                          <Button
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          >
                            {t('booking.pay')}
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
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
    </Container>
  )
}
