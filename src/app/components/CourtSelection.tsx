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
import { Court } from '@/type'
import { useTranslation } from 'react-i18next'

interface CourtSelectionProps {
  courts: Court[];
  selectedCourtIds: string[];
  onToggleCourt: (court: Court) => void;
  maxSelectable?: number;
  loading?: boolean;
  error?: string | null;
}

export default function CourtSelection({
  courts,
  selectedCourtIds,
  onToggleCourt,
  maxSelectable,
  loading = false,
  error = null,
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
                        label={`${court.pricePerHour} ${court.currency}/hr`}
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
