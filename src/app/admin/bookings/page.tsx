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
  Box,
  Tabs,
  Tab,
} from '@mui/material'
import { Booking, Court, PaymentStatus, Venue } from '@/type'
import bookingsService from '../../services/bookings'
import courtsService from '../../services/courts'
import venueService from '../../services/venues'
import moment from 'moment'
import Layout from '../../components/Layout/index'

interface BundleGroup {
  bundleID: string;
  bookings: Booking[];
  date: string;
  startTime: string;
  endTime: string;
  currency: string;
  totalPrice: number;
  paymentStatus: string;
  slip?: string;
  slipTimestamp?: string;
  bookerName: string;
  bookerContact: string;
}

export default function VenueAdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [venueDetails, setVenueDetails] = useState<Record<string, Venue>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'paid'>('pending')
  const [slipDialogOpen, setSlipDialogOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<BundleGroup | null>(null)
  const [approving, setApproving] = useState(false)

  const loadBookings = async(status: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await bookingsService.getVenueBookings(status)
      setBookings(data)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings(tab)
  }, [tab])

  const groupedBundles = useMemo<BundleGroup[]>(() => {
    const map = new Map<string, Booking[]>()
    bookings.forEach((b) => {
      const key = b.bookingBundleID || `single-${b.id}`
      const list = map.get(key) || []
      list.push(b)
      map.set(key, list)
    })

    return Array.from(map.entries()).map(([bundleID, items]) => {
      const sorted = [...items].sort((a, b) =>
        moment(`${a.date} ${a.startTime}`).valueOf() - moment(`${b.date} ${b.startTime}`).valueOf()
      )
      const first = sorted[0]
      const totalPrice = sorted.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0)
      const bookerName = first.guestName || first.userID || 'Unknown'
      const bookerContact = first.guestPhone || first.guestEmail || ''

      return {
        bundleID,
        bookings: sorted,
        date: first.date,
        startTime: first.startTime,
        endTime: first.endTime,
        currency: first.currency,
        totalPrice,
        paymentStatus: first.paymentStatus,
        slip: first.slip,
        slipTimestamp: first.slipTimestamp,
        bookerName: String(bookerName),
        bookerContact,
      }
    }).sort((a, b) =>
      moment(b.slipTimestamp || b.date).valueOf() - moment(a.slipTimestamp || a.date).valueOf()
    )
  }, [bookings])

  const handleViewSlip = (bundle: BundleGroup) => {
    setSelectedBundle(bundle)
    setSlipDialogOpen(true)
  }

  const handleApprove = async() => {
    if (!selectedBundle) return
    try {
      setApproving(true)
      await bookingsService.approvePayment(selectedBundle.bundleID)
      setSlipDialogOpen(false)
      await loadBookings(tab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve payment')
    } finally {
      setApproving(false)
    }
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Venue Bookings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review payment slips and approve bookings for your venues
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Awaiting Approval" value="pending" />
          <Tab label="Approved" value="paid" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : groupedBundles.length === 0 ? (
          <Alert severity="info">
            {tab === 'pending' ? 'No bookings awaiting payment approval.' : 'No approved bookings yet.'}
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Venue / Court</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Booker</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Slip Uploaded</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedBundles.map((group) => {
                  const firstCourt = courtDetails[group.bookings[0]?.courtID]
                  const venue = firstCourt ? venueDetails[firstCourt.venueID] : undefined
                  return (
                    <TableRow key={group.bundleID} hover>
                      <TableCell>
                        {venue && (
                          <Typography variant="body2" fontWeight={600}>
                            {venue.name.en || venue.name.th}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          {group.bookings.map((b) => courtDetails[b.courtID]?.name || '...').join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell>{moment(group.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell>{group.startTime} – {group.endTime}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{group.bookerName}</Typography>
                        {group.bookerContact && (
                          <Typography variant="caption" color="text.secondary">{group.bookerContact}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {group.totalPrice.toFixed(2)} {group.currency}
                      </TableCell>
                      <TableCell>
                        {group.slipTimestamp
                          ? moment(group.slipTimestamp).format('DD/MM/YYYY HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {group.slip && (
                          <Button
                            size="small"
                            variant={tab === 'pending' ? 'contained' : 'outlined'}
                            color={tab === 'pending' ? 'success' : 'primary'}
                            onClick={() => handleViewSlip(group)}
                          >
                            {tab === 'pending' ? 'Review Slip' : 'View Slip'}
                          </Button>
                        )}
                        {tab === 'paid' && (
                          <Chip size="small" label="Approved" color="success" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Slip review dialog */}
        <Dialog
          open={slipDialogOpen}
          onClose={() => !approving && setSlipDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {tab === 'pending' ? 'Review Payment Slip' : 'Payment Slip'}
          </DialogTitle>
          <DialogContent>
            {selectedBundle && (
              <Box>
                {/* Booking summary */}
                <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  {selectedBundle.bookings.map((b) => {
                    const court = courtDetails[b.courtID]
                    const venue = court ? venueDetails[court.venueID] : undefined
                    return (
                      <Box key={b.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2">
                          {venue?.name.en || venue?.name.th} · {court?.name} · {moment(b.date).format('DD/MM/YYYY')} · {b.startTime}–{b.endTime}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                          {Number(b.totalPrice).toFixed(2)} {b.currency}
                        </Typography>
                      </Box>
                    )
                  })}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2">Total</Typography>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {selectedBundle.totalPrice.toFixed(2)} {selectedBundle.currency}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Booker:</strong> {selectedBundle.bookerName}
                    {selectedBundle.bookerContact && ` · ${selectedBundle.bookerContact}`}
                  </Typography>
                </Box>

                {/* Slip image */}
                {selectedBundle.slip ? (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Payment slip uploaded {selectedBundle.slipTimestamp
                        ? `on ${moment(selectedBundle.slipTimestamp).format('DD/MM/YYYY [at] HH:mm')}`
                        : ''}:
                    </Typography>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedBundle.slip}
                      alt="Payment slip"
                      style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 4 }}
                    />
                  </>
                ) : (
                  <Alert severity="warning">No slip image available.</Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSlipDialogOpen(false)} disabled={approving}>
              Close
            </Button>
            {tab === 'pending' && (
              <Button
                onClick={handleApprove}
                color="success"
                variant="contained"
                disabled={approving}
              >
                {approving ? <CircularProgress size={20} /> : 'Approve Payment'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}
