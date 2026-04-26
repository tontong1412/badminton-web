'use client'

import { useState, useEffect, useMemo } from 'react'
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
import bookingsService from '../services/bookings'
import courtsService from '../services/courts'
import { useAppDispatch } from '../libs/redux/store'
import { setBookings, removeBooking, setError as setBookingError } from '../libs/redux/slices/bookingSlice'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import Layout from '../components/Layout'

export default function MyBookingsPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const [bookings, setBookingsState] = useState<Booking[]>([])
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [payingBundleID, setPayingBundleID] = useState<string | null>(null)

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
      const totalPrice = sortedItems.reduce((sum, item) => sum + item.totalPrice, 0)
      const allConfirmed = sortedItems.every((item) => item.status === 'confirmed')
      const anyCancelled = sortedItems.some((item) => item.status === 'cancelled')
      const allPaid = sortedItems.every((item) => item.paymentStatus === 'paid')
      const anyUnpaid = sortedItems.some((item) => item.paymentStatus === 'unpaid')

      return {
        groupKey,
        bundleID: first.bookingBundleID,
        bookings: sortedItems,
        date: first.date,
        startTime: first.startTime,
        endTime: first.endTime,
        currency: first.currency,
        totalPrice,
        status: allConfirmed ? 'confirmed' : (anyCancelled ? 'cancelled' : 'pending'),
        paymentStatus: allPaid ? 'paid' : (anyUnpaid ? 'unpaid' : 'pending'),
      }
    })

    return grouped.sort((a, b) => {
      const aDate = moment(`${a.date} ${a.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
      const bDate = moment(`${b.date} ${b.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
      return bDate - aDate
    })
  }, [bookings])

  useEffect(() => {
    const loadBookings = async() => {
      try {
        setLoading(true)
        const data = await bookingsService.getAll()
        console.log(data)
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

  const handleCancelClick = (bookingIds: string[]) => {
    setSelectedBookingIds(bookingIds)
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async() => {
    if (selectedBookingIds.length === 0) return

    try {
      setCancelling(true)
      await Promise.all(selectedBookingIds.map((bookingId) => bookingsService.cancel(bookingId)))

      setBookingsState((prev) => prev.filter((booking) => !selectedBookingIds.includes(booking.id)))
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

  const handlePayBundle = async(bundleID: string, bookingIds: string[]) => {
    try {
      setPayingBundleID(bundleID)
      await bookingsService.payBooking(bundleID)

      setBookingsState((prev) => {
        const updated = prev.map((booking) =>
          bookingIds.includes(booking.id)
            ? { ...booking, paymentStatus: 'paid' as const }
            : booking
        )
        dispatch(setBookings(updated))
        return updated
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pay booking'
      setError(message)
      console.error('Error paying booking bundle:', err)
    } finally {
      setPayingBundleID(null)
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
                {groupedBookings.map((group) => (
                  <TableRow key={group.groupKey} hover>
                    <TableCell>
                      {group.bookings.map((booking) => courtDetails[booking.courtID]?.name || 'Loading...').join(', ')}
                      {group.bundleID && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          Bundle: {group.bundleID}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {moment(group.date).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      {group.startTime} - {group.endTime}
                    </TableCell>
                    <TableCell>
                      {group.totalPrice.toFixed(2)} {group.currency}
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
                    </TableCell>
                    <TableCell align="right">
                      {group.status === 'confirmed' && (
                        <>
                          {moment(`${group.date} ${group.startTime}`, 'YYYY-MM-DD HH:mm').isAfter(moment()) && (
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => handleCancelClick(group.bookings.map((booking) => booking.id))}
                            >
                              {t('booking.cancel')}
                            </Button>
                          )}
                          {group.paymentStatus === 'unpaid' && group.bundleID && (
                            <Button
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 1 }}
                              onClick={() => handlePayBundle(group.bundleID as string, group.bookings.map((booking) => booking.id))}
                              disabled={payingBundleID === group.bundleID}
                            >
                              {payingBundleID === group.bundleID ? <CircularProgress size={16} /> : t('booking.pay')}
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
      </Container>
    </Layout>
  )
}
