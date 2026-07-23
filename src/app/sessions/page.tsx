'use client'

import { useSessions } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import Layout from '@/app/components/Layout'
import { OpenPlaySession, SessionPricingType, SessionStatus } from '@/type'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import EuroOutlinedIcon from '@mui/icons-material/EuroOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import Link from 'next/link'
import { useSelector } from 'react-redux'

const statusColorMap: Record<SessionStatus, 'default' | 'success' | 'warning' | 'error'> = {
  [SessionStatus.Upcoming]: 'default',
  [SessionStatus.Full]: 'warning',
  [SessionStatus.Ongoing]: 'success',
  [SessionStatus.Completed]: 'default',
  [SessionStatus.Cancelled]: 'error',
}

const formatSessionDate = (session: OpenPlaySession) => {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(session.date))
}

const renderPricing = (session: OpenPlaySession) => {
  if (session.pricing.type === SessionPricingType.Fixed) {
    return `${session.pricing.currency} ${session.pricing.fixedPrice ?? 0} per player`
  }

  const activePlayers = session.currentParticipants > 0 ? session.currentParticipants : session.maxParticipants
  const estimatedPerPlayer = session.pricing.perPlayerCost
    ?? (session.pricing.totalCost !== undefined && activePlayers > 0
      ? Number((session.pricing.totalCost / activePlayers).toFixed(2))
      : undefined)

  if (estimatedPerPlayer !== undefined) {
    return `${session.pricing.currency} ${estimatedPerPlayer} shared per player`
  }

  return `${session.pricing.currency} ${session.pricing.totalCost ?? 0} shared total`
}

export default function SessionsPage() {
  const { sessions, isLoading, isError } = useSessions()
  const user = useSelector((state: RootState) => state.app.user)

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight={700}>Open Play Sessions</Typography>
              <Typography color="text.secondary">
                Browse upcoming sessions, capacity, and pricing in one place.
              </Typography>
            </Box>

            {user && (
              <Box>
                <Button
                  component={Link}
                  href="/sessions/new"
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                >
                  Create session
                </Button>
              </Box>
            )}
          </Stack>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {!isLoading && isError && (
            <Alert severity="error">Unable to load sessions right now.</Alert>
          )}

          {!isLoading && !isError && sessions.length === 0 && (
            <Alert severity="info">No open play sessions have been published yet.</Alert>
          )}

          <Stack spacing={2}>
            {sessions.map((session) => (
              <Card key={session.id} variant="outlined">
                <CardActionArea component={Link} href={`/sessions/${session.id}`}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>{session.title}</Typography>
                          <Typography color="text.secondary">{session.venueSnapshot.name.en}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Chip label="Open Play" size="small" />
                          <Chip label={session.status} color={statusColorMap[session.status]} size="small" />
                        </Stack>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarMonthOutlinedIcon fontSize="small" color="action" />
                          <Typography variant="body2">{formatSessionDate(session)} · {session.startTime} - {session.endTime}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocationOnOutlinedIcon fontSize="small" color="action" />
                          <Typography variant="body2">{session.venueSnapshot.address}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <GroupOutlinedIcon fontSize="small" color="action" />
                          <Typography variant="body2">{session.currentParticipants}/{session.maxParticipants} players · {session.waitingCount} waiting</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EuroOutlinedIcon fontSize="small" color="action" />
                          <Typography variant="body2">{renderPricing(session)}</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Layout>
  )
}
