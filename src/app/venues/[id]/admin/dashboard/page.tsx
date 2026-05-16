'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Divider,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BookingStatus, PaymentStatus, User } from '@/type'
import { useVenue, useCourts, useVenueBookings } from '../../../../libs/data'
import moment from 'moment'
import { useParams, useRouter } from 'next/navigation'
import Layout from '../../../../components/Layout/index'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../libs/redux/store'

type DateRange = '7d' | '30d' | '90d' | 'year'

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
      <Typography variant="h4" fontWeight={700} color={color ?? 'text.primary'}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  )
}

export default function VenueDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const venueID = params.id as string
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)

  const [range, setRange] = useState<DateRange>('30d')

  const { venue, isLoading: venueLoading, isError: venueError } = useVenue(venueID)
  const { courts: allCourts, isLoading: courtsLoading } = useCourts()
  const { bookings, isLoading: bookingsLoading, isError: bookingsError } = useVenueBookings({ venueID })

  const courts = useMemo(() => allCourts.filter((c) => c.venueID === venueID), [allCourts, venueID])

  const initLoading = venueLoading || courtsLoading || bookingsLoading
  const error = venueError || bookingsError ? 'Failed to load dashboard data' : null

  // Auth / access guard
  useEffect(() => {
    if (!userReady) return
    if (!venue) return
    const isSystemAdmin = (user as { role?: string })?.role === 'admin'
    const userID = (user as unknown as { id: string } | null)?.id
    const isOwner = venue.ownerUserID === userID
    const isManager = venue.managerUserIDs.includes(userID ?? '')
    if (!userID || (!isSystemAdmin && !isOwner && !isManager)) router.replace('/admin')
  }, [venue, user, userReady, router])

  const rangeStart = useMemo(() => {
    const map: Record<DateRange, moment.Moment> = {
      '7d': moment().subtract(7, 'days').startOf('day'),
      '30d': moment().subtract(30, 'days').startOf('day'),
      '90d': moment().subtract(90, 'days').startOf('day'),
      'year': moment().subtract(1, 'year').startOf('day'),
    }
    return map[range]
  }, [range])

  const filtered = useMemo(
    () => bookings.filter(
      (b) =>
        b.status !== BookingStatus.Cancelled &&
        moment(b.date).isSameOrAfter(rangeStart)
    ),
    [bookings, rangeStart]
  )

  const paidBookings = useMemo(
    () => filtered.filter((b) => b.paymentStatus === PaymentStatus.Paid),
    [filtered]
  )

  const pendingBookings = useMemo(
    () => filtered.filter((b) => b.paymentStatus === PaymentStatus.Pending),
    [filtered]
  )

  // ── Revenue ────────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => paidBookings.reduce((s, b) => s + b.totalPrice, 0),
    [paidBookings]
  )

  const pendingRevenue = useMemo(
    () => pendingBookings.reduce((s, b) => s + b.totalPrice, 0),
    [pendingBookings]
  )

  const currency = courts[0]?.currency ?? 'THB'

  // ── Booking counts ─────────────────────────────────────────────────────────
  const totalBookings = filtered.length
  const paidCount = paidBookings.length
  const pendingCount = pendingBookings.length

  // ── Court utilisation ──────────────────────────────────────────────────────
  const courtUtilisation = useMemo(() => {
    const activeCourts = courts.filter((c) => c.status === 'active')
    if (!venue || activeCourts.length === 0) return []

    const dayCount = moment().diff(rangeStart, 'days') + 1
    const totalCourtMinutesPerDay = activeCourts.length * 60 // rough 1-hr baseline per court per day; replaced below
    void totalCourtMinutesPerDay

    return activeCourts.map((court) => {
      const courtBookings = filtered.filter((b) => b.courtID === court.id)
      const bookedMinutes = courtBookings.reduce((s, b) => s + b.durationMinutes, 0)

      // Capacity: average open minutes per day × days in range
      const schedule = venue.weeklySchedule
      let totalCapacityMinutes = 0
      for (let i = 0; i < dayCount; i++) {
        const d = moment(rangeStart).add(i, 'days')
        const entry = schedule?.[String(d.day())]
        if (entry) {
          totalCapacityMinutes += timeToMinutes(entry.close) - timeToMinutes(entry.open)
        }
      }
      const utilPct = totalCapacityMinutes > 0 ? Math.round((bookedMinutes / totalCapacityMinutes) * 100) : 0

      return { court, bookedMinutes, utilPct }
    }).sort((a, b) => b.utilPct - a.utilPct)
  }, [courts, filtered, venue, rangeStart])

  // ── Revenue by day (last 14 days within range) ─────────────────────────────
  const revenueByDay = useMemo(() => {
    const days = Math.min(moment().diff(rangeStart, 'days') + 1, 14)
    return Array.from({ length: days }, (_, i) => {
      const day = moment().subtract(days - 1 - i, 'days')
      const dayStr = day.format('YYYY-MM-DD')
      const rev = paidBookings
        .filter((b) => moment(b.date).format('YYYY-MM-DD') === dayStr)
        .reduce((s, b) => s + b.totalPrice, 0)
      return { label: day.format('DD MMM'), rev }
    })
  }, [paidBookings, rangeStart])

  // ── Peak hours ─────────────────────────────────────────────────────────────
  const peakHours = useMemo(() => {
    const counts: Record<number, number> = {}
    filtered.forEach((b) => {
      const startH = parseInt(b.startTime.split(':')[0])
      const endH = parseInt(b.endTime.split(':')[0])
      for (let h = startH; h < endH; h++) {
        counts[h] = (counts[h] ?? 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([h, count]) => ({ hour: `${h.padStart(2, '0')}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filtered])

  // ── Booker type split ──────────────────────────────────────────────────────
  const guestCount = filtered.filter((b) => b.bookerType === 'guest').length
  const userCount = filtered.filter((b) => b.bookerType === 'user').length

  // ── Avg booking duration ───────────────────────────────────────────────────
  const avgDuration = filtered.length > 0
    ? Math.round(filtered.reduce((s, b) => s + b.durationMinutes, 0) / filtered.length)
    : 0

  if (initLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    )
  }

  const fmtPrice = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
  const maxBarRev = Math.max(...revenueByDay.map((d) => d.rev), 1)

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
          value="dashboard"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          onChange={(_, v) => {
            if (v === 'timetable') router.push(`/venues/${venueID}/admin/timetable`)
            if (v === 'bookings') router.push(`/venues/${venueID}/admin/bookings`)
            if (v === 'settings') router.push(`/venues/${venueID}/admin/settings`)
          }}
        >
          <Tab label="Dashboard" value="dashboard" />
          <Tab label="Timetable" value="timetable" />
          <Tab label="Payments" value="bookings" />
          <Tab label="Settings" value="settings" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Date range selector */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <ToggleButtonGroup
            value={range}
            exclusive
            onChange={(_, v) => { if (v) setRange(v) }}
            size="small"
          >
            <ToggleButton value="7d">7 days</ToggleButton>
            <ToggleButton value="30d">30 days</ToggleButton>
            <ToggleButton value="90d">90 days</ToggleButton>
            <ToggleButton value="year">1 year</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* ── KPI row ────────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="Total Revenue"
              value={`${fmtPrice(totalRevenue)} ${currency}`}
              sub="Paid bookings"
              color="success.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="Pending Revenue"
              value={`${fmtPrice(pendingRevenue)} ${currency}`}
              sub="Awaiting approval"
              color="warning.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="Total Bookings"
              value={totalBookings}
              sub={`${paidCount} paid · ${pendingCount} pending`}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="Avg Duration"
              value={`${avgDuration} min`}
              sub="Per booking"
            />
          </Grid>
        </Grid>

        {/* ── Revenue bar chart ──────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Daily Revenue (last {Math.min(moment().diff(rangeStart, 'days') + 1, 14)} days)
          </Typography>
          {revenueByDay.every((d) => d.rev === 0) ? (
            <Typography variant="body2" color="text.secondary">No paid revenue in this period.</Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 160, overflowX: 'auto' }}>
              {revenueByDay.map((d) => (
                <Box key={d.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 32px', minWidth: 32 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, whiteSpace: 'nowrap', fontSize: 10 }}>
                    {d.rev > 0 ? fmtPrice(d.rev) : ''}
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      bgcolor: 'primary.main',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max((d.rev / maxBarRev) * 120, d.rev > 0 ? 4 : 0)}px`,
                      transition: 'height 0.3s',
                    }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, fontSize: 10, whiteSpace: 'nowrap' }}>{d.label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* ── Court utilisation ──────────────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Court Utilisation</Typography>
              {courtUtilisation.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No courts found.</Typography>
              ) : (
                courtUtilisation.map(({ court, bookedMinutes, utilPct }) => (
                  <Box key={court.id} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>{court.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {utilPct}% · {Math.round(bookedMinutes / 60)}h booked
                      </Typography>
                    </Box>
                    <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'grey.200', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.min(utilPct, 100)}%`,
                          bgcolor: utilPct >= 70 ? 'success.main' : utilPct >= 40 ? 'primary.main' : 'warning.main',
                          borderRadius: 1,
                          transition: 'width 0.3s',
                        }}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>

          {/* ── Peak hours ─────────────────────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Top 5 Peak Hours</Typography>
              {peakHours.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No booking data in this period.</Typography>
              ) : (
                peakHours.map(({ hour, count }, i) => (
                  <Box key={hour} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Typography variant="body2" sx={{ width: 52, fontWeight: 500 }}>#{i + 1} {hour}</Typography>
                    <Box sx={{ flex: 1, height: 8, borderRadius: 1, bgcolor: 'grey.200', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.round((count / (peakHours[0]?.count ?? 1)) * 100)}%`,
                          bgcolor: 'secondary.main',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ width: 48, textAlign: 'right' }}>
                      {count} slot{count !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ── Booker type & extra stats ──────────────────────────────────── */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Registered Users" value={userCount} sub={`${totalBookings > 0 ? Math.round((userCount / totalBookings) * 100) : 0}% of bookings`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Guest Bookings" value={guestCount} sub={`${totalBookings > 0 ? Math.round((guestCount / totalBookings) * 100) : 0}% of bookings`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Active Courts" value={courts.filter((c) => c.status === 'active').length} sub={`of ${courts.length} total`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Avg Revenue / Booking"
              value={paidCount > 0 ? `${fmtPrice(totalRevenue / paidCount)} ${currency}` : '—'}
              sub="Paid bookings only"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* ── Revenue by court ──────────────────────────────────────────── */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Revenue by Court</Typography>
          {courts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No courts.</Typography>
          ) : (
            courts.map((court) => {
              const rev = paidBookings.filter((b) => b.courtID === court.id).reduce((s, b) => s + b.totalPrice, 0)
              const maxRev = Math.max(...courts.map((c) => paidBookings.filter((b) => b.courtID === c.id).reduce((s, b) => s + b.totalPrice, 0)), 1)
              return (
                <Box key={court.id} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>{court.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{fmtPrice(rev)} {currency}</Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'grey.200', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${Math.round((rev / maxRev) * 100)}%`, bgcolor: 'primary.light', borderRadius: 1, transition: 'width 0.3s' }} />
                  </Box>
                </Box>
              )
            })
          )}
        </Paper>
      </Container>
    </Layout>
  )
}
