'use client'

import { useEffect, useMemo } from 'react'
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
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PaymentIcon from '@mui/icons-material/Payment'
import AddIcon from '@mui/icons-material/Add'
import { User } from '@/type'
import { useVenues } from '../libs/data'
import { useSelector } from 'react-redux'
import { RootState } from '../libs/redux/store'
import { useRouter } from 'next/navigation'
import Layout from '../components/Layout/index'

export default function AdminHubPage() {
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)
  const router = useRouter()
  const { venues: allVenues, isLoading: loading, isError } = useVenues()
  const error = isError ? 'Failed to load venues' : null

  const venues = useMemo(() => {
    const isAdmin = (user as { role?: string })?.role === 'admin'
    if (isAdmin) return allVenues
    const userID = (user as unknown as { id: string } | null)?.id
    return allVenues.filter((v) => v.ownerUserID === userID)
  }, [allVenues, user])

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
          </>
        )}
      </Container>
    </Layout>
  )
}
