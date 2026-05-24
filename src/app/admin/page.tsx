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
import QRCode from 'react-qr-code'
import generatePayload from 'promptpay-qr'

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

  // Group payouts by sellerID + bookingDate
  const groupedPayouts = useMemo(() => {
    const map = new Map<string, typeof payouts>()
    for (const p of payouts) {
      const key = `${p.sellerID}__${p.bookingDate ?? 'unknown'}`
      const arr = map.get(key) ?? []
      arr.push(p)
      map.set(key, arr)
    }
    return Array.from(map.values())
  }, [payouts])

  const handleMarkGroupPaid = async(group: typeof payouts) => {
    const groupKey = `${group[0].sellerID}__${group[0].bookingDate}`
    try {
      setMarkingPaid(groupKey)
      setPayoutError(null)
      await Promise.all(group.map((p) => resaleService.markSellerPaid(p.id)))
      mutatePayouts()
    } catch {
      setPayoutError('Failed to mark payouts as paid')
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
                  Transfer the net amount (after 10% fee) to each seller. Grouped by seller and booking date.
                </Typography>
                {payoutError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPayoutError(null)}>{payoutError}</Alert>}
                {payoutsLoading ? (
                  <CircularProgress size={24} />
                ) : groupedPayouts.length === 0 ? (
                  <Alert severity="success">No pending seller payouts.</Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {groupedPayouts.map((group) => {
                      const first = group[0]
                      const groupKey = `${first.sellerID}__${first.bookingDate}`
                      const total = group.reduce((sum, p) => sum + p.askingPrice, 0)
                      const netAmount = total * 0.9
                      const currency = first.currency
                      const pi = first.sellerPaymentInfo
                      const isGroupMarking = markingPaid === groupKey

                      return (
                        <Paper key={groupKey} variant="outlined" sx={{ p: 2 }}>
                          {/* Header: seller + date */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                            <Box>
                              <Typography fontWeight={700}>{first.sellerName ?? first.sellerID}</Typography>
                              {first.sellerPhone && (
                                <Typography variant="body2" color="text.secondary">{first.sellerPhone}</Typography>
                              )}
                              <Typography variant="body2" color="text.secondary">
                                {first.bookingDate ? moment(first.bookingDate).format('DD MMM YYYY') : 'Unknown date'}
                              </Typography>
                            </Box>
                            {/* Net payout amount */}
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" color="text.secondary">Gross</Typography>
                              <Typography variant="body2">{total.toFixed(2)} {currency}</Typography>
                              <Typography variant="caption" color="text.secondary">Transfer (−10%)</Typography>
                              <Typography fontWeight={700} color="success.main" fontSize="1.1rem">
                                {netAmount.toFixed(2)} {currency}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Payment info */}
                          {pi && (pi.accountNumber || pi.promptPayID) ? (
                            <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5, mb: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <Box sx={{ flex: 1, minWidth: 160 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">TRANSFER TO</Typography>
                                {pi.accountName && <Typography variant="body2">{pi.accountName}</Typography>}
                                {pi.bankName && <Typography variant="body2">{pi.bankName}</Typography>}
                                {pi.accountNumber && <Typography variant="body2">Acc: {pi.accountNumber}</Typography>}
                                {pi.promptPayID && <Typography variant="body2">PromptPay: {pi.promptPayID}</Typography>}
                              </Box>
                              {pi.promptPayID && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                  <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                    <QRCode
                                      value={generatePayload(pi.promptPayID, { amount: netAmount })}
                                      size={100}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">{netAmount.toFixed(2)} {currency}</Typography>
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>No payment info on file for this seller.</Alert>
                          )}

                          {/* Slot rows */}
                          <Table size="small" sx={{ mb: 1.5 }}>
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Court / Slot</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Sold At</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Asking Price</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Net</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {group.map((payout) => (
                                <TableRow key={payout.id}>
                                  <TableCell>
                                    {payout.courtName ?? '—'}
                                    {payout.bookingStartTime && payout.bookingEndTime && (
                                      <Typography variant="caption" display="block" color="text.secondary">
                                        {payout.bookingStartTime}–{payout.bookingEndTime}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>{payout.soldAt ? moment(payout.soldAt).format('DD MMM HH:mm') : '—'}</TableCell>
                                  <TableCell align="right">{payout.askingPrice.toFixed(2)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                                    {(payout.askingPrice * 0.9).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              disabled={isGroupMarking}
                              onClick={() => handleMarkGroupPaid(group)}
                            >
                              {isGroupMarking ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Mark All Paid'}
                            </Button>
                          </Box>
                        </Paper>
                      )
                    })}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Container>
    </Layout>
  )
}
