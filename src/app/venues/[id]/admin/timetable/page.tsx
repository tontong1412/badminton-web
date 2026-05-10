'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Booking, BookingStatus, Court, PaymentStatus, User, Venue } from '@/type'
import bookingsService from '../../../../services/bookings'
import venueService from '../../../../services/venues'
import moment from 'moment'
import { useParams, useRouter } from 'next/navigation'
import Layout from '../../../../components/Layout/index'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../libs/redux/store'

// Generate half-hour slots from 06:00 to 23:00
const ALL_SLOTS: string[] = []
for (let h = 6; h < 23; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
ALL_SLOTS.push('23:00')

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getStatusColor(status: BookingStatus, paymentStatus: PaymentStatus): string {
  if (status === BookingStatus.Cancelled) return '#e0e0e0'
  if (paymentStatus === PaymentStatus.Paid) return '#c8e6c9'
  if (paymentStatus === PaymentStatus.Pending) return '#fff9c4'
  return '#bbdefb'
}

function getStatusLabel(paymentStatus: PaymentStatus): string {
  if (paymentStatus === PaymentStatus.Paid) return 'Paid'
  if (paymentStatus === PaymentStatus.Pending) return 'Slip Uploaded'
  return 'Unpaid'
}

function getEndTimeOptions(startTime: string): string[] {
  const startMin = timeToMinutes(startTime)
  const opts: string[] = []
  for (let m = startMin + 30; m <= timeToMinutes('23:00'); m += 30) {
    const h = Math.floor(m / 60)
    const min = m % 60
    opts.push(`${String(h).padStart(2, '0')}:${min === 0 ? '00' : '30'}`)
  }
  return opts
}

interface BookingCell {
  booking: Booking;
  slotStart: string;
  rowSpan: number;
}

export default function VenueTimetablePage() {
  const params = useParams()
  const router = useRouter()
  const venueID = params.id as string
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null

  const [venue, setVenue] = useState<Venue | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [date, setDate] = useState<string>(moment().format('YYYY-MM-DD'))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null)
  const [bookDialog, setBookDialog] = useState<{ court: Court; startTime: string } | null>(null)
  const [bookEndTime, setBookEndTime] = useState('')
  const [bookGuestName, setBookGuestName] = useState('')
  const [bookGuestPhone, setBookGuestPhone] = useState('')
  const [bookGuestEmail, setBookGuestEmail] = useState('')
  const [bookSubmitting, setBookSubmitting] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const init = async() => {
      try {
        const [v, allCourts] = await Promise.all([
          venueService.getById(venueID),
          venueService.getCourts(),
        ])
        const userID = (user as unknown as { id: string } | null)?.id
        const isOwner = v.ownerUserID === userID
        const isManager = v.managerUserIDs.includes(userID ?? '')
        if (!userID || (!isOwner && !isManager)) {
          router.replace('/admin')
          return
        }
        setVenue(v)
        setCourts(allCourts.filter((c) => c.venueID === venueID && c.status === 'active'))
      } catch (e) {
        setError('Failed to load venue')
        console.error(e)
      } finally {
        setInitLoading(false)
      }
    }
    init()
  }, [venueID, user, router])

  const refreshBookings = useCallback(async() => {
    if (!date) return
    try {
      setLoading(true)
      setError(null)
      const data = await bookingsService.getVenueBookings({ date, venueID })
      setBookings(data)
    } catch (e) {
      setError('Failed to load bookings')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [date, venueID])

  useEffect(() => {
    refreshBookings()
  }, [refreshBookings])

  const openBookDialog = (court: Court, slot: string) => {
    const opts = getEndTimeOptions(slot)
    setBookDialog({ court, startTime: slot })
    setBookEndTime(opts[0] || '')
    setBookGuestName('')
    setBookGuestPhone('')
    setBookGuestEmail('')
    setBookError(null)
  }

  const handleBook = async() => {
    if (!bookDialog || !bookEndTime) return
    try {
      setBookSubmitting(true)
      setBookError(null)
      await bookingsService.createBundle({
        items: [{ courtID: bookDialog.court.id, date, startTime: bookDialog.startTime, endTime: bookEndTime }],
        guestName: bookGuestName || undefined,
        guestPhone: bookGuestPhone || undefined,
        guestEmail: bookGuestEmail || undefined,
      })
      setBookDialog(null)
      await refreshBookings()
    } catch (e) {
      setBookError('Failed to create booking')
      console.error(e)
    } finally {
      setBookSubmitting(false)
    }
  }

  const handleCancel = async() => {
    if (!detailBooking) return
    try {
      setCancelling(true)
      await bookingsService.cancel(detailBooking.id)
      setCancelConfirm(false)
      setDetailBooking(null)
      await refreshBookings()
    } catch (e) {
      setError('Failed to cancel booking')
      console.error(e)
    } finally {
      setCancelling(false)
    }
  }

  const sortedCourts = [...courts].sort((a, b) => a.name.localeCompare(b.name))

  // Build cellMap
  const cellMap = new Map<string, Map<string, BookingCell>>()
  sortedCourts.forEach((c) => cellMap.set(c.id, new Map()))

  bookings.forEach((booking) => {
    if (booking.status === BookingStatus.Cancelled) return
    const courtSlots = cellMap.get(booking.courtID)
    if (!courtSlots) return
    const startMin = timeToMinutes(booking.startTime)
    const endMin = timeToMinutes(booking.endTime)
    const rowSpan = Math.ceil((endMin - startMin) / 30)
    const slotStart = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${startMin % 60 === 0 ? '00' : '30'}`
    courtSlots.set(slotStart, { booking, slotStart, rowSpan })
  })

  const activeSlots = ALL_SLOTS.slice(0, ALL_SLOTS.length - 1)

  if (initLoading) {
    return (
      <Layout>
        <Container sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin')}
            sx={{ mr: 1 }}
          >
            All Venues
          </Button>
        </Box>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {venue?.name.en || venue?.name.th}
        </Typography>

        {/* Sub-nav tabs */}
        <Tabs
          value="timetable"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          onChange={(_, v) => v === 'bookings' && router.push(`/venues/${venueID}/admin/bookings`)}
        >
          <Tab label="Timetable" value="timetable" />
          <Tab label="Payments" value="bookings" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
        )}

        {/* Date picker + legend */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ width: 14, height: 14, bgcolor: '#bbdefb', border: '1px solid #ccc', borderRadius: 0.5 }} />
            <Typography variant="caption">Unpaid</Typography>
            <Box sx={{ width: 14, height: 14, bgcolor: '#fff9c4', border: '1px solid #ccc', borderRadius: 0.5, ml: 1 }} />
            <Typography variant="caption">Slip Uploaded</Typography>
            <Box sx={{ width: 14, height: 14, bgcolor: '#c8e6c9', border: '1px solid #ccc', borderRadius: 0.5, ml: 1 }} />
            <Typography variant="caption">Paid</Typography>
          </Box>
        </Box>

        {sortedCourts.length === 0 ? (
          <Alert severity="info">No active courts found for this venue.</Alert>
        ) : (
          <Paper sx={{ overflowX: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{
                      width: 64, minWidth: 64, padding: '8px 4px',
                      background: '#f5f5f5', borderBottom: '2px solid #e0e0e0',
                      borderRight: '1px solid #e0e0e0', fontSize: 12, color: '#666',
                      position: 'sticky', left: 0, zIndex: 2,
                    }}>
                      Time
                    </th>
                    {sortedCourts.map((court) => (
                      <th key={court.id} style={{
                        padding: '8px 12px', background: '#f5f5f5',
                        borderBottom: '2px solid #e0e0e0', borderRight: '1px solid #e0e0e0',
                        fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'center',
                      }}>
                        {court.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSlots.map((slot) => (
                    <tr key={slot}>
                      <td style={{
                        padding: '2px 6px', fontSize: 11, color: '#888',
                        borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #f0f0f0',
                        background: '#fafafa', whiteSpace: 'nowrap', verticalAlign: 'top',
                        position: 'sticky', left: 0, zIndex: 1, height: 36,
                      }}>
                        {slot}
                      </td>
                      {sortedCourts.map((court) => {
                        const courtSlots = cellMap.get(court.id)!
                        const cell = courtSlots.get(slot)

                        const isOccupied = Array.from(courtSlots.entries()).some(([cellSlot, c]) => {
                          if (cellSlot === slot) return false
                          const cellStart = timeToMinutes(cellSlot)
                          const cellEnd = cellStart + c.rowSpan * 30
                          const slotMin = timeToMinutes(slot)
                          return slotMin > cellStart && slotMin < cellEnd
                        })

                        if (isOccupied) return null

                        if (cell) {
                          const { booking, rowSpan } = cell
                          return (
                            <td
                              key={court.id}
                              rowSpan={rowSpan}
                              onClick={() => setDetailBooking(booking)}
                              style={{
                                background: getStatusColor(booking.status, booking.paymentStatus),
                                border: '2px solid white',
                                padding: '4px 8px',
                                verticalAlign: 'top',
                                cursor: 'pointer',
                                fontSize: 12,
                                lineHeight: 1.4,
                                height: rowSpan * 36,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{booking.startTime}–{booking.endTime}</div>
                              {booking.guestName && <div style={{ color: '#444' }}>{booking.guestName}</div>}
                              {booking.guestPhone && <div style={{ color: '#666', fontSize: 11 }}>{booking.guestPhone}</div>}
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'rgba(0,0,0,0.08)' }}>
                                {getStatusLabel(booking.paymentStatus)}
                              </span>
                            </td>
                          )
                        }

                        return (
                          <td
                            key={court.id}
                            onClick={() => openBookDialog(court, slot)}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableCellElement).style.background = '#f0f7ff' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableCellElement).style.background = '' }}
                            style={{
                              borderRight: '1px solid #e0e0e0',
                              borderBottom: '1px solid #f0f0f0',
                              height: 36,
                              cursor: 'pointer',
                            }}
                          />
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Paper>
        )}

        {/* Detail dialog */}
        <Dialog open={!!detailBooking} onClose={() => setDetailBooking(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Booking Detail</DialogTitle>
          <DialogContent>
            {detailBooking && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{moment(detailBooking.date).format('DD/MM/YYYY')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Time</Typography>
                  <Typography variant="body2">{detailBooking.startTime} – {detailBooking.endTime}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Amount</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {Number(detailBooking.totalPrice).toFixed(2)} {detailBooking.currency}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Payment</Typography>
                  <Chip
                    size="small"
                    label={getStatusLabel(detailBooking.paymentStatus)}
                    color={
                      detailBooking.paymentStatus === PaymentStatus.Paid ? 'success'
                        : detailBooking.paymentStatus === PaymentStatus.Pending ? 'warning'
                          : 'default'
                    }
                  />
                </Box>
                {(detailBooking.guestName || detailBooking.guestPhone || detailBooking.guestEmail) && (
                  <>
                    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Booker</Typography>
                    </Box>
                    {detailBooking.guestName && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Name</Typography>
                        <Typography variant="body2">{detailBooking.guestName}</Typography>
                      </Box>
                    )}
                    {detailBooking.guestPhone && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Phone</Typography>
                        <Typography variant="body2">{detailBooking.guestPhone}</Typography>
                      </Box>
                    )}
                    {detailBooking.guestEmail && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Email</Typography>
                        <Typography variant="body2">{detailBooking.guestEmail}</Typography>
                      </Box>
                    )}
                  </>
                )}
                {detailBooking.note && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Note</Typography>
                    <Typography variant="body2" sx={{ textAlign: 'right', maxWidth: '60%' }}>{detailBooking.note}</Typography>
                  </Box>
                )}
                {detailBooking.slip && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Payment Slip</Typography>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detailBooking.slip}
                      alt="Payment slip"
                      style={{ width: '100%', marginTop: 8, borderRadius: 4, maxHeight: 300, objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {detailBooking?.status !== BookingStatus.Cancelled && (
              <Button color="error" onClick={() => setCancelConfirm(true)} sx={{ mr: 'auto' }}>
                Cancel Booking
              </Button>
            )}
            <Button onClick={() => setDetailBooking(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Cancel confirmation dialog */}
        <Dialog open={cancelConfirm} onClose={() => !cancelling && setCancelConfirm(false)} maxWidth="xs">
          <DialogTitle>Cancel Booking?</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to cancel this booking? This cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelConfirm(false)} disabled={cancelling}>Keep</Button>
            <Button color="error" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <CircularProgress size={18} /> : 'Cancel Booking'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* New booking dialog */}
        <Dialog open={!!bookDialog} onClose={() => !bookSubmitting && setBookDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>New Booking — {bookDialog?.court.name}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
            {bookError && <Alert severity="error" sx={{ mb: 1 }}>{bookError}</Alert>}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField size="small" label="Date" value={date} InputProps={{ readOnly: true }} fullWidth />
              <TextField size="small" label="Start" value={bookDialog?.startTime || ''} InputProps={{ readOnly: true }} fullWidth />
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>End Time</InputLabel>
              <Select
                label="End Time"
                value={bookEndTime}
                onChange={(e) => setBookEndTime(e.target.value)}
              >
                {bookDialog && getEndTimeOptions(bookDialog.startTime).map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider />
            <TextField size="small" label="Guest Name" value={bookGuestName} onChange={(e) => setBookGuestName(e.target.value)} fullWidth />
            <TextField size="small" label="Guest Phone" value={bookGuestPhone} onChange={(e) => setBookGuestPhone(e.target.value)} fullWidth />
            <TextField size="small" label="Guest Email" value={bookGuestEmail} onChange={(e) => setBookGuestEmail(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBookDialog(null)} disabled={bookSubmitting}>Cancel</Button>
            <Button variant="contained" onClick={handleBook} disabled={!bookEndTime || bookSubmitting}>
              {bookSubmitting ? <CircularProgress size={18} /> : 'Book'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}
