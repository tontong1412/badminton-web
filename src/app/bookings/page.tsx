'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  TextField,
  Box,
  Divider,
  Tabs,
  Tab,
} from '@mui/material'
import { Booking, Court, PaymentStatus, Venue } from '@/type'
import bookingsService from '../services/bookings'
import courtsService from '../services/courts'
import venueService from '../services/venues'
import { useAppDispatch } from '../libs/redux/store'
import { setBookings, removeBooking, setError as setBookingError } from '../libs/redux/slices/bookingSlice'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import Layout from '../components/Layout'

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

  const [bookings, setBookingsState] = useState<Booking[]>([])
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [venueDetails, setVenueDetails] = useState<Record<string, Venue>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [payingBundleID, setPayingBundleID] = useState<string | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payTargetBundleID, setPayTargetBundleID] = useState<string | null>(null)
  const [payTargetBookingIds, setPayTargetBookingIds] = useState<string[]>([])
  const [payTargetBookings, setPayTargetBookings] = useState<Booking[]>([])
  const [payTargetCurrency, setPayTargetCurrency] = useState<string>('THB')
  const [payTargetVenue, setPayTargetVenue] = useState<Venue | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [slipNote, setSlipNote] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'past' | 'cancelled'>('active')

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
      const totalPrice = sortedItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
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

  const activeBookings = useMemo(
    () => groupedBookings.filter((g) => {
      if (g.status === 'cancelled') return false
      const lastBooking = g.bookings[g.bookings.length - 1]
      return moment(`${lastBooking.date} ${lastBooking.endTime}`, 'YYYY-MM-DD HH:mm').isAfter(moment())
    }),
    [groupedBookings],
  )
  const pastBookings = useMemo(
    () => groupedBookings.filter((g) => {
      if (g.status === 'cancelled') return false
      const lastBooking = g.bookings[g.bookings.length - 1]
      return moment(`${lastBooking.date} ${lastBooking.endTime}`, 'YYYY-MM-DD HH:mm').isSameOrBefore(moment())
    }),
    [groupedBookings],
  )
  const cancelledBookings = useMemo(
    () => groupedBookings.filter((g) => g.status === 'cancelled'),
    [groupedBookings],
  )
  const displayedBookings = activeTab === 'cancelled' ? cancelledBookings : activeTab === 'past' ? pastBookings : activeBookings

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

  const handlePayBundle = async(bundleID: string, bookingIds: string[], currency: string) => {
    const bundleBookings = bookings.filter((b) => bookingIds.includes(b.id))
    const firstCourtID = bundleBookings[0]?.courtID
    const court = firstCourtID ? courtDetails[firstCourtID] : undefined
    const venue = court ? venueDetails[court.venueID] : undefined
    setPayTargetBundleID(bundleID)
    setPayTargetBookingIds(bookingIds)
    setPayTargetBookings(bundleBookings)
    setPayTargetCurrency(currency)
    setPayTargetVenue(venue ?? null)
    setSlipFile(null)
    setSlipPreview(null)
    setSlipNote('')
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
      const result = await bookingsService.payBooking(payTargetBundleID, { slip: slipPreview, note: slipNote || undefined })
      setBookingsState((prev) => {
        const updated = prev.map((booking) =>
          payTargetBookingIds.includes(booking.id)
            ? { ...booking, paymentStatus: PaymentStatus.Pending }
            : booking
        )
        dispatch(setBookings(updated))
        return updated
      })
      setPayDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pay booking'
      setError(message)
    } finally {
      setPaySubmitting(false)
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
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Venue</TableCell>
                  <TableCell>{t('booking.date')}</TableCell>
                  <TableCell>{t('booking.court')}</TableCell>
                  <TableCell>{t('booking.time')}</TableCell>
                  <TableCell>{t('booking.price')}</TableCell>
                  <TableCell>{t('booking.status')}</TableCell>
                  <TableCell>{t('booking.paymentStatus')}</TableCell>
                  <TableCell align="right">{t('booking.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedBookings.map((group) => {
                  const firstCourt = courtDetails[group.bookings[0]?.courtID]
                  const venue = firstCourt ? venueDetails[firstCourt.venueID] : undefined
                  return (
                  <TableRow key={group.groupKey} hover>
                    <TableCell>
                      {venue ? (venue.name.en || venue.name.th) : '—'}
                    </TableCell>
                    <TableCell>
                      {moment(group.date).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      {group.bookings.map((booking) => (
                        <Typography key={booking.id} variant="body2" sx={{ mb: 0.25 }}>
                          {courtDetails[booking.courtID]?.name || '—'}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell>
                      {group.bookings.map((booking) => (
                        <Typography key={booking.id} variant="body2" sx={{ mb: 0.25 }}>
                          {booking.startTime} – {booking.endTime}
                        </Typography>
                      ))}
                    </TableCell>
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
                          {group.status === 'confirmed' &&
                            moment(`${group.date} ${group.startTime}`, 'YYYY-MM-DD HH:mm').isAfter(moment()) && (
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
            {payTargetVenue?.payment ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  {t('booking.paymentMethod')}
                </Typography>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="body2"><strong>{t('booking.bankName')}:</strong> {payTargetVenue.payment.bankName}</Typography>
                  <Typography variant="body2"><strong>{t('booking.accountName')}:</strong> {payTargetVenue.payment.accountName}</Typography>
                  <Typography variant="body2"><strong>{t('booking.accountNumber')}:</strong> {payTargetVenue.payment.accountNumber}</Typography>
                  {payTargetVenue.payment.promptPayID && (
                    <Typography variant="body2"><strong>{t('booking.promptPayID')}:</strong> {payTargetVenue.payment.promptPayID}</Typography>
                  )}
                  {payTargetVenue.payment.qrCodeUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
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
              {slipFile ? slipFile.name : t('booking.chooseFile')}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleSlipFileChange}
              />
            </Button>
            {slipPreview && (
              // eslint-disable-next-line @next/next/no-img-element
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
      </Container>
    </Layout>
  )
}
