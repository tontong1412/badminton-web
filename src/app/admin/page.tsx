'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PaymentIcon from '@mui/icons-material/Payment'
import AddIcon from '@mui/icons-material/Add'
import { User } from '@/type'
import { useVenues, useResalePayouts } from '../libs/data'
import { useSelector } from 'react-redux'
import { RootState } from '../libs/redux/store'
import { useRouter } from 'next/navigation'
import Layout from '../components/Layout/index'
import resaleService from '../services/resale'
import moment from 'moment'

export default function AdminHubPage() {
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)
  const router = useRouter()
  const { venues: allVenues, isLoading: loading, isError } = useVenues()
  const error = isError ? 'Failed to load venues' : null

  const isSystemAdmin = (user as { role?: string })?.role === 'admin'
  const { payouts, isLoading: payoutsLoading, mutate: mutatePayouts } = useResalePayouts(isSystemAdmin)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [payoutError, setPayoutError] = useState<string | null>(null)

  const handleMarkSellerPaid = async(listingID: string) => {
    try {
      setMarkingPaid(listingID)
      setPayoutError(null)
      await resaleService.markSellerPaid(listingID)
      mutatePayouts()
    } catch {
      setPayoutError('Failed to mark seller as paid')
    } finally {
      setMarkingPaid(null)
    }
  }

  const venues = useMemo(() => {
    if (isSystemAdmin) return allVenues
    const userID = (user as unknown as { id: string } | null)?.id
    return allVenues.filter((v) => v.ownerUserID === userID)
  }, [allVenues, user, isSystemAdmin])

  useEffect(() => {
    if (userReady && !user) router.push('/')
  }, [userReady, user, router])

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {!userReady ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
              Venue Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Manage bookings and timetables for your venues
            </Typography>

            {(user as { role?: string })?.role === 'admin' && (
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/admin/venues/new')}
                >
                  Create New Venue
                </Button>
              </Box>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
              <CircularProgress />
            ) : venues.length === 0 ? (
              <Alert severity="info">You do not own any venues.</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {venues.map((venue) => (
                  <Card key={venue.id} sx={{ minWidth: 280, maxWidth: 360, flex: '1 1 280px' }} elevation={2}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600}>
                        {venue.name.en || venue.name.th}
                      </Typography>
                      {venue.name.en && venue.name.th && (
                        <Typography variant="body2" color="text.secondary">{venue.name.th}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">{venue.address}</Typography>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<CalendarMonthIcon />}
                        onClick={() => router.push(`/venues/${venue.id}/admin/timetable`)}
                        size="small"
                      >
                        Timetable
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PaymentIcon />}
                        onClick={() => router.push(`/venues/${venue.id}/admin/bookings`)}
                        size="small"
                      >
                        Payments
                      </Button>
                    </CardActions>
                  </Card>
                ))}
              </Box>
            )}

            {/* Resale Seller Payouts — system admin only */}
            {isSystemAdmin && (
              <Box sx={{ mt: 5 }}>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h5" fontWeight="bold">Resale Seller Payouts</Typography>
                  {payouts.length > 0 && (
                    <Chip label={`${payouts.length} pending`} color="warning" size="small" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Transfer the asking price to each seller after the buyer has paid the system.
                </Typography>
                {payoutError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPayoutError(null)}>{payoutError}</Alert>}
                {payoutsLoading ? (
                  <CircularProgress size={24} />
                ) : payouts.length === 0 ? (
                  <Alert severity="success">No pending seller payouts.</Alert>
                ) : (
                  <Paper variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 700 }}>Seller</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Court / Slot</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Sold At</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id} hover>
                            <TableCell>{payout.sellerName ?? payout.sellerID}</TableCell>
                            <TableCell>{payout.sellerPhone ?? '—'}</TableCell>
                            <TableCell>
                              {payout.courtName ?? '—'}
                              {payout.bookingStartTime && payout.bookingEndTime && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {payout.bookingStartTime}–{payout.bookingEndTime}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {payout.bookingDate ? moment(payout.bookingDate).format('DD MMM YYYY') : '—'}
                            </TableCell>
                            <TableCell>
                              {payout.soldAt ? moment(payout.soldAt).format('DD MMM HH:mm') : '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {payout.askingPrice.toFixed(2)} {payout.currency}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                disabled={markingPaid === payout.id}
                                onClick={() => handleMarkSellerPaid(payout.id)}
                              >
                                Mark Paid
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>
            )}
          </>
        )}
      </Container>
    </Layout>
  )
}
