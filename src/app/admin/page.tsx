'use client'

import { useEffect, useState } from 'react'
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
import { Venue, User } from '@/type'
import venueService from '../services/venues'
import { useSelector } from 'react-redux'
import { RootState } from '../libs/redux/store'
import { useRouter } from 'next/navigation'
import Layout from '../components/Layout/index'

export default function AdminHubPage() {
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    const load = async() => {
      try {
        const all = await venueService.getAll()
        setVenues(all.filter((v) => v.ownerUserID === (user as unknown as { id: string }).id))
      } catch (e) {
        setError('Failed to load venues')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, router])

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
          Venue Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Manage bookings and timetables for your venues
        </Typography>

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
      </Container>
    </Layout>
  )
}
