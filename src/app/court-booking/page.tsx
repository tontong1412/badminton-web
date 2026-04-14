'use client'

import { useState, useEffect } from 'react'
import {
  Avatar,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import { Venue } from '@/type'
import venueService from '../services/venues'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'

export default function VenuesPage() {
  const { t } = useTranslation()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVenues = async() => {
      try {
        setLoading(true)
        const data = await venueService.getAll()
        setVenues(data)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load venues'
        setError(message)
        console.error('Error loading venues:', err)
      } finally {
        setLoading(false)
      }
    }

    loadVenues()
  }, [])

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
      <Box sx={{ width: '100%', backgroundColor: '#80644f' }}>
        <Container maxWidth="lg" sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box
            component="section"
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ width: 200, height: 200, bgcolor: '#ff7961' }}>
              <SportsTennisIcon sx={{ fontSize: 100 }} />
            </Avatar>
          </Box>
          <Box
            component="section"
            sx={{
              p: 2,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' },
              justifyContent: 'center',
              color: 'grey.200',
            }}
          >
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {t('booking.venues')}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {venues.length} {t('booking.viewCourts')}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {venues.length === 0 ? (
          <Alert severity="info">
            {t('booking.noVenuesAvailable')}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {venues.map((venue) => (
              <Grid item xs={12} sm={6} md={4} key={venue.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                      {venue.name.en || venue.name.th}
                    </Typography>
                    {venue.name.th && venue.name.en && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {venue.name.th}
                      </Typography>
                    )}
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {venue.address}
                    </Typography>

                    {venue.slotDurationMinutes && (
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={`${venue.slotDurationMinutes} min slots`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    )}

                    {venue.gapPolicy?.enabled && (
                      <Typography variant="caption" color="textSecondary">
                        {t('booking.gapPolicy')}: {venue.gapPolicy.minimumGapMinutes} {t('booking.minutes')}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Link href={`/court-booking/${venue.id}`} style={{ textDecoration: 'none' }}>
                      <Button size="small" variant="contained" color="primary">
                        {t('booking.viewCourts')}
                      </Button>
                    </Link>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Layout>
  )
}
