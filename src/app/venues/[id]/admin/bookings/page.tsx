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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Booking, Court, User, Venue } from '@/type'
import bookingsService from '../../../../services/bookings'
import courtsService from '../../../../services/courts'
import { useVenue, useVenueBookings } from '../../../../libs/data'
import moment from 'moment'
import { useParams, useRouter } from 'next/navigation'
import Layout from '../../../../components/Layout/index'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../libs/redux/store'

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
  bookerPhone: string;
  bookerEmail: string;
  bookerType: string;
  note: string;
}

export default function VenuePaymentsPage() {
  const params = useParams()
  const router = useRouter()
  const venueID = params.id as string
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)

  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [venueDetails, setVenueDetails] = useState<Record<string, Venue>>({})
  const [tab, setTab] = useState<'pending' | 'paid'>('pending')
  const [slipDialogOpen, setSlipDialogOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<BundleGroup | null>(null)
  const [approving, setApproving] = useState(false)

  const { venue, isLoading: initLoading, isError: venueError } = useVenue(venueID)
  const { bookings, isLoading: loading, isError: bookingsError, mutate: mutateBookings } = useVenueBookings({ venueID, paymentStatus: tab })

  const error = venueError || bookingsError ? 'Failed to load data' : null

  // Auth / access guard
  useEffect(() => {
    if (!userReady || !venue) return
    const userID = (user as unknown as { id: string } | null)?.id
    const isOwner = venue.ownerUserID === userID
    const isManager = venue.managerUserIDs.includes(userID ?? '')
    if (!userID || (!isOwner && !isManager)) router.replace('/admin')
  }, [venue, user, userReady, router])

  // Load court/venue details whenever bookings change
  useEffect(() => {
    if (bookings.length === 0) return
    const load = async() => {
      const courtIds = [...new Set(bookings.map((b) => b.courtID))]
      const courts: Record<string, Court> = { ...courtDetails }
      const venues: Record<string, Venue> = { ...venueDetails }
      for (const courtId of courtIds) {
        if (courts[courtId]) continue
        try {
          const court = await courtsService.getById(courtId)
          courts[courtId] = court
          if (!venues[court.venueID]) {
            venues[court.venueID] = venue!
          }
        } catch (err) {
          console.error(`Failed to load court ${courtId}:`, err)
        }
      }
      setCourtDetails(courts)
      setVenueDetails(venues)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

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
        bookerName: first.bookerName || first.guestName || first.userID || 'Unknown',
        bookerPhone: first.bookerPhone || first.guestPhone || '',
        bookerEmail: first.guestEmail || '',
        bookerType: first.bookerType || 'guest',
        note: first.note || '',
      }
    }).filter((g) => Boolean(g.slip)).sort((a, b) =>
      moment(b.slipTimestamp || b.date).valueOf() - moment(a.slipTimestamp || a.date).valueOf()
    )
  }, [bookings])

  const handleApprove = async() => {
    if (!selectedBundle) return
    try {
      setApproving(true)
      await bookingsService.approvePayment(selectedBundle.bundleID)
      setSlipDialogOpen(false)
      mutateBookings()
    } catch (err) {
      console.error(err)
    } finally {
      setApproving(false)
    }
  }

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
      <Container maxWidth="lg" sx={{ pt: 2, pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => router.push('/admin')} sx={{ mr: 1 }}>
            All Venues
          </Button>
        </Box>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {venue?.name.en || venue?.name.th}
        </Typography>

        <Tabs
          value="bookings"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          onChange={(_, v) => {
            if (v === 'dashboard') router.push(`/venues/${venueID}/admin/dashboard`)
            if (v === 'timetable') router.push(`/venues/${venueID}/admin/timetable`)
            if (v === 'settings') router.push(`/venues/${venueID}/admin/settings`)
          }}
        >
          <Tab label="Dashboard" value="dashboard" />
          <Tab label="Timetable" value="timetable" />
          <Tab label="Payments" value="bookings" />
          <Tab label="Settings" value="settings" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

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
          <>
            {/* ── Desktop table ── */}
            <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Court</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Booker</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Slip Uploaded</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedBundles.map((group) => (
                    <TableRow key={group.bundleID} hover>
                      <TableCell>
                        {group.bookings.map((b) => courtDetails[b.courtID]?.name || '...').join(', ')}
                      </TableCell>
                      <TableCell>{moment(group.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell>{group.startTime} – {group.endTime}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{group.bookerName}</Typography>
                        {group.bookerPhone && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{group.bookerPhone}</Typography>
                        )}
                        {group.bookerEmail && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{group.bookerEmail}</Typography>
                        )}
                        {group.bookerType === 'user' && (
                          <Typography variant="caption" color="primary" sx={{ display: 'block' }}>Registered user</Typography>
                        )}
                      </TableCell>
                      <TableCell>{group.totalPrice.toFixed(2)} {group.currency}</TableCell>
                      <TableCell>
                        {group.slipTimestamp ? moment(group.slipTimestamp).format('DD/MM/YYYY HH:mm') : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {group.slip && (
                          <Button
                            size="small"
                            variant={tab === 'pending' ? 'contained' : 'outlined'}
                            color={tab === 'pending' ? 'success' : 'primary'}
                            onClick={() => { setSelectedBundle(group); setSlipDialogOpen(true) }}
                          >
                            {tab === 'pending' ? 'Review Slip' : 'View Slip'}
                          </Button>
                        )}
                        {tab === 'paid' && <Chip size="small" label="Approved" color="success" sx={{ ml: 1 }} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* ── Mobile cards ── */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
              {groupedBundles.map((group) => (
                <Paper key={group.bundleID} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {group.bookings.map((b) => courtDetails[b.courtID]?.name || '...').join(', ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {moment(group.date).format('DD MMM YYYY')} · {group.startTime}–{group.endTime}
                      </Typography>
                    </Box>
                    {tab === 'paid' && <Chip size="small" label="Approved" color="success" />}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{group.bookerName}</Typography>
                      {group.bookerPhone && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📞 {group.bookerPhone}</Typography>
                      )}
                      {group.bookerEmail && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>✉️ {group.bookerEmail}</Typography>
                      )}
                      {group.bookerType === 'user' && (
                        <Typography variant="caption" color="primary" sx={{ display: 'block' }}>Registered user</Typography>
                      )}
                      {group.note && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>Note: {group.note}</Typography>
                      )}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ flexShrink: 0, ml: 1 }}>
                      {group.totalPrice.toFixed(2)} {group.currency}
                    </Typography>
                  </Box>

                  {group.slipTimestamp && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Slip uploaded {moment(group.slipTimestamp).format('DD/MM/YYYY HH:mm')}
                    </Typography>
                  )}

                  {group.slip && (
                    <Button
                      size="small"
                      fullWidth
                      variant={tab === 'pending' ? 'contained' : 'outlined'}
                      color={tab === 'pending' ? 'success' : 'primary'}
                      sx={{ mt: 1.5 }}
                      onClick={() => { setSelectedBundle(group); setSlipDialogOpen(true) }}
                    >
                      {tab === 'pending' ? 'Review Slip' : 'View Slip'}
                    </Button>
                  )}
                </Paper>
              ))}
            </Box>
          </>
        )}

        {/* Slip review dialog */}
        <Dialog open={slipDialogOpen} onClose={() => !approving && setSlipDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{tab === 'pending' ? 'Review Payment Slip' : 'Payment Slip'}</DialogTitle>
          <DialogContent>
            {selectedBundle && (
              <Box>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  {selectedBundle.bookings.map((b) => {
                    const court = courtDetails[b.courtID]
                    const v = court ? venueDetails[court.venueID] : undefined
                    return (
                      <Box key={b.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2">
                          {v?.name.en || v?.name.th} · {court?.name} · {moment(b.date).format('DD/MM/YYYY')} · {b.startTime}–{b.endTime}
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
                {selectedBundle.slip ? (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Uploaded {selectedBundle.slipTimestamp
                        ? `on ${moment(selectedBundle.slipTimestamp).format('DD/MM/YYYY [at] HH:mm')}`
                        : ''}:
                    </Typography>
                    { }
                    <img src={selectedBundle.slip} alt="Payment slip"
                      style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 4 }} />
                  </>
                ) : (
                  <Alert severity="warning">No slip image available.</Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSlipDialogOpen(false)} disabled={approving}>Close</Button>
            {tab === 'pending' && (
              <Button onClick={handleApprove} color="success" variant="contained" disabled={approving}>
                {approving ? <CircularProgress size={20} /> : 'Approve Payment'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}
