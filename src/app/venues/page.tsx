'use client'

import {
  Box,
  Container,
  Grid,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useVenues } from '../libs/data'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'

const ACCENTS = [
  { bg: '#80644f', light: '#F5EDE4', border: '#D4B8A0' },
  { bg: '#9c795f', light: '#F7F0E8', border: '#DCC8B0' },
  { bg: '#695241', light: '#F0E8E0', border: '#C8B098' },
  { bg: '#80644f', light: '#F5EDE4', border: '#D4B8A0' },
  { bg: '#9c795f', light: '#F7F0E8', border: '#DCC8B0' },
  { bg: '#695241', light: '#F0E8E0', border: '#C8B098' },
]

export default function VenuesPage() {
  const { t } = useTranslation()
  const { venues, isLoading: loading, isError } = useVenues()
  const error = isError ? 'Failed to load venues' : null

  if (loading) {
    return (
      <Layout>
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: '#80644f' }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>

        {/* ── Hero header ────────────────────────────────────────── */}
        <Box sx={{ bgcolor: '#80644f' }}>
          <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
            <Typography
              variant="overline"
              sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 3, fontSize: '0.7rem' }}
            >
              {t('booking.courtBookingTitle')}
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{ color: '#fff', lineHeight: 1.15, mt: 0.5, fontSize: { xs: '2rem', md: '2.75rem' } }}
            >
              {t('booking.venues')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Box sx={{ height: 2, width: 32, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                {t('booking.venuesAvailable', { count: venues.length })}
              </Typography>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {venues.length === 0 ? (
            <Box sx={{ bgcolor: '#fff', border: '1px solid #D4B8A0', borderRadius: 3, p: 8, textAlign: 'center' }}>
              <SportsTennisIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 2 }} />
              <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                {t('booking.noVenuesAvailable')}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {venues.map((venue, idx) => {
                const accent = ACCENTS[idx % ACCENTS.length]
                return (
                  <Grid item xs={12} sm={6} md={4} key={venue.id}>
                    <Box
                      sx={{
                        bgcolor: '#fff',
                        border: '1px solid #D4B8A0',
                        borderRadius: 3,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        transition: 'border-color 0.2s, transform 0.2s',
                        '&:hover': {
                          borderColor: accent.bg,
                          transform: 'translateY(-3px)',
                        },
                      }}
                    >
                      {/* Card header — cover image or colour fallback */}
                      <Box
                        sx={{
                          height: 140,
                          position: 'relative',
                          overflow: 'hidden',
                          bgcolor: accent.bg,
                        }}
                      >
                        {venue.coverImage ? (
                          <Box
                            component="img"
                            src={venue.coverImage}
                            alt={venue.name?.en || venue.name?.th}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <>
                            {/* Decorative circles fallback */}
                            <Box sx={{ position: 'absolute', right: -24, bottom: -24, width: 96, height: 96, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
                            <Box sx={{ position: 'absolute', right: 24, top: -32, width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.07)' }} />
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', px: 3, pb: 2 }}>
                              <SportsTennisIcon sx={{ fontSize: 26, color: 'rgba(255,255,255,0.85)', mb: 0.75 }} />
                              <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase' }}>
                                {t('booking.courtVenue')}
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Box>

                      <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Name */}
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{ color: '#0F172A', lineHeight: 1.25, mb: 0.25, fontSize: '1.05rem' }}
                        >
                          {venue.name.en || venue.name.th}
                        </Typography>
                        {venue.name.th && venue.name.en && (
                          <Typography variant="caption" sx={{ color: '#94A3B8', mb: 1.5, display: 'block' }}>
                            {venue.name.th}
                          </Typography>
                        )}

                        {/* Divider */}
                        <Box sx={{ height: '1px', bgcolor: '#F5EDE4', mb: 1.5 }} />

                        {/* Address */}
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', mb: 2 }}>
                          <PlaceOutlinedIcon sx={{ fontSize: 14, color: '#94A3B8', mt: '3px', flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.55, fontSize: '0.82rem' }}>
                            {venue.address}
                          </Typography>
                        </Box>

                        {/* CTA */}
                        <Link href={`/venues/${venue.id}`} style={{ textDecoration: 'none', marginTop: 'auto' }}>
                          <Button
                            fullWidth
                            endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
                            sx={{
                              bgcolor: accent.bg,
                              color: '#fff',
                              borderRadius: 2,
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              textTransform: 'none',
                              py: 1.1,
                              letterSpacing: 0.3,
                              '&:hover': { bgcolor: accent.bg, filter: 'brightness(0.88)' },
                            }}
                          >
                            {t('booking.viewCourts')}
                          </Button>
                        </Link>
                      </Box>
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Container>
      </Box>
    </Layout>
  )
}

