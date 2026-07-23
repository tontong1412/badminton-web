'use client'

import Layout from '@/app/components/Layout'
import { useMySessionRegistration, useSession } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import sessionsService from '@/app/services/sessions'
import { SessionPricingType, SessionRegistrationStatus, SessionStatus } from '@/type'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useSelector } from 'react-redux'

const statusColorMap: Record<SessionStatus, 'default' | 'success' | 'warning' | 'error'> = {
  [SessionStatus.Upcoming]: 'default',
  [SessionStatus.Full]: 'warning',
  [SessionStatus.Ongoing]: 'success',
  [SessionStatus.Completed]: 'default',
  [SessionStatus.Cancelled]: 'error',
}

const formatPrice = (currency: string, amount: number | undefined) => `${currency} ${amount ?? 0}`

const getSharedPerPlayerEstimate = (
  totalCost: number | undefined,
  currentParticipants: number,
  maxParticipants: number,
  storedPerPlayerCost: number | undefined,
) => {
  if (storedPerPlayerCost !== undefined) return storedPerPlayerCost
  if (totalCost === undefined) return undefined
  const divisor = currentParticipants > 0 ? currentParticipants : maxParticipants
  if (divisor <= 0) return undefined
  return Number((totalCost / divisor).toFixed(2))
}

const registrationStatusLabel: Record<SessionRegistrationStatus, string> = {
  [SessionRegistrationStatus.Pending]: 'Pending approval',
  [SessionRegistrationStatus.Approved]: 'Registered',
  [SessionRegistrationStatus.WaitingList]: 'Waiting list',
  [SessionRegistrationStatus.Rejected]: 'Rejected',
  [SessionRegistrationStatus.Cancelled]: 'Cancelled',
  [SessionRegistrationStatus.Removed]: 'Removed',
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const { session, isLoading, isError, mutate: mutateSession } = useSession(params.id)
  const { registration, mutate: mutateRegistration } = useMySessionRegistration(params.id)
  const user = useSelector((state: RootState) => state.app.user)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegistrationActive = registration && [
    SessionRegistrationStatus.Pending,
    SessionRegistrationStatus.Approved,
    SessionRegistrationStatus.WaitingList,
  ].includes(registration.registrationStatus)

  const handleRegister = async() => {
    if (!params.id) return
    setActionError(null)
    setIsSubmitting(true)
    try {
      await sessionsService.register(params.id)
      await Promise.all([mutateRegistration(), mutateSession()])
    } catch (error) {
      const message = typeof error === 'object' && error !== null && 'response' in error
        ? String((error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error
          ?? (error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message
          ?? 'Unable to register right now.')
        : error instanceof Error ? error.message : 'Unable to register right now.'
      setActionError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRegistration = async() => {
    if (!params.id) return
    setActionError(null)
    setIsSubmitting(true)
    try {
      await sessionsService.cancelRegistration(params.id)
      await Promise.all([mutateRegistration(), mutateSession()])
    } catch (error) {
      const message = typeof error === 'object' && error !== null && 'response' in error
        ? String((error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error
          ?? (error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message
          ?? 'Unable to cancel registration right now.')
        : error instanceof Error ? error.message : 'Unable to cancel registration right now.'
      setActionError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    )
  }

  if (isError || !session) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">Session not found.</Alert>
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight={700}>{session.title}</Typography>
              <Typography color="text.secondary">{session.venueSnapshot.name.en}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label="Open Play" size="small" />
              <Chip label={session.status} color={statusColorMap[session.status]} size="small" />
            </Stack>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarMonthOutlinedIcon fontSize="small" color="action" />
                <Typography>
                  {new Intl.DateTimeFormat('en-GB', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }).format(new Date(session.date))} · {session.startTime} - {session.endTime}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOnOutlinedIcon fontSize="small" color="action" />
                <Typography>{session.venueSnapshot.address}</Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <GroupOutlinedIcon fontSize="small" color="action" />
                <Typography>{session.currentParticipants}/{session.maxParticipants} registered · {session.waitingCount} waiting</Typography>
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Organizer</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonOutlineOutlinedIcon fontSize="small" color="action" />
                <Typography>{session.organizerContact.name}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <PhoneOutlinedIcon fontSize="small" color="action" />
                <Typography>{session.organizerContact.phone}</Typography>
              </Stack>
              {session.organizerContact.email && (
                <Typography color="text.secondary">{session.organizerContact.email}</Typography>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Pricing</Typography>
              {session.pricing.type === SessionPricingType.Fixed ? (
                <Typography>{formatPrice(session.pricing.currency, session.pricing.fixedPrice)} per player</Typography>
              ) : (
                <Stack spacing={1}>
                  <Typography>Court rental: {formatPrice(session.pricing.currency, session.pricing.courtRentalCost)}</Typography>
                  <Typography>Shuttlecocks: {formatPrice(session.pricing.currency, session.pricing.shuttlecockCost)}</Typography>
                  <Typography>Total: {formatPrice(session.pricing.currency, session.pricing.totalCost)}</Typography>
                  <Typography>
                    Per player estimate: {formatPrice(
                      session.pricing.currency,
                      getSharedPerPlayerEstimate(
                        session.pricing.totalCost,
                        session.currentParticipants,
                        session.maxParticipants,
                        session.pricing.perPlayerCost,
                      ),
                    )}
                  </Typography>
                </Stack>
              )}

              <Divider />
              <Typography color="text.secondary">
                Registration {session.registrationOpen ? 'is open' : 'is closed'}.
                {session.requiresApproval ? ' Organizer approval is required.' : ' Registrations are auto-accepted until capacity is reached.'}
              </Typography>
              {session.notes && <Typography>{session.notes}</Typography>}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Your registration</Typography>

              {!user && (
                <Alert severity="info">Sign in with a linked player profile to register for this session.</Alert>
              )}

              {user && registration && (
                <Stack spacing={1}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Chip label={registrationStatusLabel[registration.registrationStatus]} size="small" />
                    {registration.waitingPosition && (
                      <Typography color="text.secondary">Waiting position: {registration.waitingPosition}</Typography>
                    )}
                  </Stack>
                  <Typography color="text.secondary">
                    Registered on {new Intl.DateTimeFormat('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(registration.registeredAt))}
                  </Typography>
                </Stack>
              )}

              {actionError && <Alert severity="error">{actionError}</Alert>}

              {user && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {!isRegistrationActive ? (
                    <Button
                      variant="contained"
                      onClick={handleRegister}
                      disabled={isSubmitting || !session.registrationOpen || [SessionStatus.Cancelled, SessionStatus.Completed].includes(session.status)}
                    >
                      {isSubmitting ? 'Registering...' : 'Register for session'}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleCancelRegistration}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Cancelling...' : 'Cancel registration'}
                    </Button>
                  )}

                  {!session.registrationOpen && !isRegistrationActive && (
                    <Typography color="text.secondary">Registration is currently closed.</Typography>
                  )}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Layout>
  )
}
