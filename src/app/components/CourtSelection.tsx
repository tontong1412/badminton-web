'use client'

import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material'
import { Court, CourtPricingRule } from '@/type'
import { useTranslation } from 'react-i18next'

const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

const getPriceForWindow = (court: Court, startTime: string, endTime: string): number => {
  const rules = court.pricingRules ?? []
  const bookingStart = toMins(startTime)
  const bookingEnd = toMins(endTime)
  if (rules.length === 0) return Number(((court.pricePerHour / 60) * (bookingEnd - bookingStart)).toFixed(2))
  const boundaries = new Set<number>([bookingStart, bookingEnd])
  for (const rule of rules) {
    const rs = toMins(rule.startTime), re = toMins(rule.endTime)
    if (rs > bookingStart && rs < bookingEnd) boundaries.add(rs)
    if (re > bookingStart && re < bookingEnd) boundaries.add(re)
  }
  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  let total = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i], e = sorted[i + 1]
    const rule = rules.find((r: CourtPricingRule) => toMins(r.startTime) <= s && toMins(r.endTime) >= e)
    total += ((rule ? rule.pricePerHour : court.pricePerHour) / 60) * (e - s)
  }
  return Number(total.toFixed(2))
}

interface CourtSelectionProps {
  courts: Court[];
  selectedCourtIds: string[];
  onToggleCourt: (court: Court) => void;
  maxSelectable?: number;
  loading?: boolean;
  error?: string | null;
  slotStartTime?: string;
  slotEndTime?: string;
}

export default function CourtSelection({
  courts,
  selectedCourtIds,
  onToggleCourt,
  maxSelectable,
  loading = false,
  error = null,
  slotStartTime,
  slotEndTime,
}: CourtSelectionProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {courts.length === 0 ? (
        <Alert severity="info">
          {t('booking.noCourtsAvailable')}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {courts.map((court) => {
            const isSelected = selectedCourtIds.includes(court.id)
            const reachedSelectionLimit = Boolean(maxSelectable && selectedCourtIds.length >= maxSelectable)
            const disableSelect = court.status !== 'active' || (!isSelected && reachedSelectionLimit)

            return (
              <Grid item xs={12} sm={6} md={4} key={court.id}>
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid primary.main' : '1px solid divider',
                    backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: 3,
                    }
                  }}
                  onClick={() => {
                    if (!disableSelect || isSelected) {
                      onToggleCourt(court)
                    }
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                      {court.name}
                    </Typography>

                    {court.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {court.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Chip
                        label={slotStartTime && slotEndTime
                          ? `${getPriceForWindow(court, slotStartTime, slotEndTime).toFixed(2)} ${court.currency}`
                          : `${court.pricePerHour} ${court.currency}/hr`}
                        size="small"
                        color={court.status === 'active' ? 'success' : 'error'}
                      />
                      <Chip
                        label={court.status === 'active' ? t('booking.available') : t('booking.unavailable')}
                        size="small"
                        variant="outlined"
                        color={court.status === 'active' ? 'success' : 'error'}
                      />
                    </Box>
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      variant={isSelected ? 'contained' : 'outlined'}
                      color="primary"
                      disabled={disableSelect}
                      onClick={() => onToggleCourt(court)}
                    >
                      {isSelected ? t('booking.unselect') : t('booking.select')}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}
