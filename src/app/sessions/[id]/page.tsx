'use client'

import Layout from '@/app/components/Layout'
import { useMySessionRegistration, usePlayers, useSession } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import playersService from '@/app/services/players'
import sessionsService from '@/app/services/sessions'
import {
  NewPlayer,
  Player,
  SessionAttendanceStatus,
  SessionPricingType,
  SessionRegistrationDetail,
  SessionRegistrationPaymentStatus,
  SessionRegistrationStatus,
  SessionStatus,
} from '@/type'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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

const getParticipantName = (registration: SessionRegistrationDetail) => {
  const displayName = registration.player?.displayName?.en || registration.player?.displayName?.th
  if (displayName) return displayName

  const officialName = registration.player?.officialName?.en
    || registration.player?.officialName?.th
    || registration.player?.officialName?.pronunciation
  if (officialName) return officialName

  return registration.playerID
}

const hasParticipantPreferredName = (registration: SessionRegistrationDetail) => {
  return Boolean(
    registration.player?.displayName?.en
      || registration.player?.displayName?.th
      || registration.player?.officialName?.en
      || registration.player?.officialName?.th
      || registration.player?.officialName?.pronunciation,
  )
}

const getPlayerPreferredName = (player: Player) => {
  return player.displayName?.en
    || player.displayName?.th
    || player.officialName?.en
    || player.officialName?.th
    || player.officialName?.pronunciation
    || player.id
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const { session, isLoading, isError, mutate: mutateSession } = useSession(params.id)
  const { registration, mutate: mutateRegistration } = useMySessionRegistration(params.id)
  const { players, mutate: mutatePlayers } = usePlayers()
  const user = useSelector((state: RootState) => state.app.user)
  const [actionError, setActionError] = useState<string | null>(null)
  const [organizerError, setOrganizerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrations, setRegistrations] = useState<SessionRegistrationDetail[]>([])
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false)
  const [lifecycleAction, setLifecycleAction] = useState<string | null>(null)
  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerSearchKeyword, setPlayerSearchKeyword] = useState('')
  const [isCreatePlayerDialogOpen, setIsCreatePlayerDialogOpen] = useState(false)
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false)
  const [newPlayerForm, setNewPlayerForm] = useState({
    officialNameEn: '',
    officialNameTh: '',
    pronunciation: '',
    displayNameEn: '',
    displayNameTh: '',
    club: '',
    level: 0,
  })

  const isOrganizer = !!(session && user && session.organizerUserIDs.includes(user.id))

  const isRegistrationActive = registration && [
    SessionRegistrationStatus.Pending,
    SessionRegistrationStatus.Approved,
    SessionRegistrationStatus.WaitingList,
  ].includes(registration.registrationStatus)

  const playerOptions = [...(players ?? [])].filter(
    (player, index, source) => source.findIndex((candidate) => candidate.id === player.id) === index,
  )

  const normalizedPlayerSearchKeyword = playerSearchKeyword.trim().toLowerCase()
  const filteredPlayerOptions = normalizedPlayerSearchKeyword.length < 3
    ? []
    : playerOptions.filter((player) => {
      const searchText = [
        player.displayName?.en,
        player.displayName?.th,
        player.officialName?.en,
        player.officialName?.th,
        player.officialName?.pronunciation,
      ].filter(Boolean).join(' ').toLowerCase()

      return searchText.includes(normalizedPlayerSearchKeyword)
    })

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const responseError = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data
      return String(responseError?.error ?? responseError?.message ?? fallback)
    }
    return error instanceof Error ? error.message : fallback
  }

  const mutateSessionData = async() => {
    await Promise.all([mutateSession(), mutateRegistration()])
  }

  const loadRegistrations = useCallback(async() => {
    if (!params.id || !isOrganizer) return
    setIsLoadingRegistrations(true)
    setOrganizerError(null)
    try {
      const data = await sessionsService.getRegistrations(params.id)
      setRegistrations(data)
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to load registrations right now.'))
    } finally {
      setIsLoadingRegistrations(false)
    }
  }, [isOrganizer, params.id])

  const refreshOrganizerData = async() => {
    await Promise.all([mutateSessionData(), loadRegistrations()])
  }

  const handleRegister = async() => {
    if (!params.id) return
    setActionError(null)
    setIsSubmitting(true)
    try {
      await sessionsService.register(params.id)
      await mutateSessionData()
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to register right now.'))
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
      await mutateSessionData()
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to cancel registration right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLifecycleAction = async(action: 'close' | 'start' | 'end' | 'cancel') => {
    if (!params.id) return
    setOrganizerError(null)
    setLifecycleAction(action)
    try {
      if (action === 'close') await sessionsService.closeRegistration(params.id)
      if (action === 'start') await sessionsService.start(params.id)
      if (action === 'end') await sessionsService.end(params.id)
      if (action === 'cancel') await sessionsService.cancel(params.id)
      await refreshOrganizerData()
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to update session right now.'))
    } finally {
      setLifecycleAction(null)
    }
  }

  const addPlayerToSession = async(playerID: string) => {
    if (!params.id || !playerID.trim()) return
    setOrganizerError(null)
    setLifecycleAction('add')
    try {
      await sessionsService.addRegistration(params.id, { playerID: playerID.trim() })
      await refreshOrganizerData()
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to add player right now.'))
    } finally {
      setLifecycleAction(null)
    }
  }

  const handleManualAdd = async() => {
    if (!selectedPlayer?.id) return
    await addPlayerToSession(selectedPlayer.id)
    setSelectedPlayer(null)
    setPlayerSearchKeyword('')
  }

  const handleCreatePlayerAndAdd = async() => {
    const officialNameEn = newPlayerForm.officialNameEn.trim()
    const officialNameTh = newPlayerForm.officialNameTh.trim()
    if (!officialNameEn && !officialNameTh) {
      setOrganizerError('Please fill in official name (EN or TH).')
      return
    }

    setOrganizerError(null)
    setIsCreatingPlayer(true)
    try {
      const payload: NewPlayer = {
        officialName: {
          en: officialNameEn || undefined,
          th: officialNameTh || undefined,
          pronunciation: newPlayerForm.pronunciation.trim(),
        },
        displayName: {
          en: newPlayerForm.displayNameEn.trim() || undefined,
          th: newPlayerForm.displayNameTh.trim() || undefined,
        },
        club: newPlayerForm.club.trim(),
        level: Number(newPlayerForm.level) || 0,
      }

      const createdPlayer = await playersService.create(payload)
      await mutatePlayers()
      await addPlayerToSession(createdPlayer.id)
      setSelectedPlayer(null)
      setPlayerSearchKeyword('')
      setIsCreatePlayerDialogOpen(false)
      setNewPlayerForm({
        officialNameEn: '',
        officialNameTh: '',
        pronunciation: '',
        displayNameEn: '',
        displayNameTh: '',
        club: '',
        level: 0,
      })
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to create player right now.'))
    } finally {
      setIsCreatingPlayer(false)
    }
  }

  const withRowAction = async(registrationID: string, action: () => Promise<void>) => {
    setOrganizerError(null)
    setRowActionId(registrationID)
    try {
      await action()
      await refreshOrganizerData()
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to update participant right now.'))
    } finally {
      setRowActionId(null)
    }
  }

  useEffect(() => {
    if (!isOrganizer || !params.id) {
      setRegistrations([])
      return
    }
    void loadRegistrations()
  }, [isOrganizer, params.id, loadRegistrations])

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

          {isOrganizer && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>Organizer controls</Typography>

                {organizerError && <Alert severity="error">{organizerError}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    onClick={() => handleLifecycleAction('close')}
                    disabled={!!lifecycleAction || !session.registrationOpen || [SessionStatus.Cancelled, SessionStatus.Completed].includes(session.status)}
                  >
                    {lifecycleAction === 'close' ? 'Closing...' : 'Close registration'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => handleLifecycleAction('start')}
                    disabled={!!lifecycleAction || session.status !== SessionStatus.Upcoming}
                  >
                    {lifecycleAction === 'start' ? 'Starting...' : 'Start session'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleLifecycleAction('end')}
                    disabled={!!lifecycleAction || session.status !== SessionStatus.Ongoing}
                  >
                    {lifecycleAction === 'end' ? 'Ending...' : 'End session'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleLifecycleAction('cancel')}
                    disabled={!!lifecycleAction || [SessionStatus.Cancelled, SessionStatus.Completed].includes(session.status)}
                  >
                    {lifecycleAction === 'cancel' ? 'Cancelling...' : 'Cancel session'}
                  </Button>
                </Stack>

                <Divider />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Autocomplete
                    options={filteredPlayerOptions}
                    value={selectedPlayer}
                    inputValue={playerSearchKeyword}
                    onInputChange={(_event, value) => setPlayerSearchKeyword(value)}
                    onChange={(_event, player) => setSelectedPlayer(player)}
                    getOptionLabel={(player) => getPlayerPreferredName(player)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, player) => (
                      <li {...props} key={player.id}>
                        {getPlayerPreferredName(player)}
                      </li>
                    )}
                    noOptionsText={normalizedPlayerSearchKeyword.length < 3 ? 'Type at least 3 characters to search' : 'No players found'}
                    fullWidth
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select player"
                        placeholder="Search by display or official name"
                        size="small"
                      />
                    )}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => setIsCreatePlayerDialogOpen(true)}
                    disabled={lifecycleAction === 'add' || isCreatingPlayer}
                  >
                    New player
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleManualAdd}
                    disabled={lifecycleAction === 'add' || !selectedPlayer?.id}
                  >
                    {lifecycleAction === 'add' ? 'Adding...' : 'Add player'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}

          {isOrganizer && (
            <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
              <Stack spacing={0}>
                <Box sx={{ px: 3, py: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Participants</Typography>
                </Box>
                {isLoadingRegistrations ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Player</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Payment</TableCell>
                        <TableCell>Attendance</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {registrations.map((item) => {
                        const rowBusy = rowActionId === item.id
                        const canApprove = item.registrationStatus === SessionRegistrationStatus.Pending || item.registrationStatus === SessionRegistrationStatus.WaitingList
                        const canReject = item.registrationStatus === SessionRegistrationStatus.Pending || item.registrationStatus === SessionRegistrationStatus.WaitingList
                        const canRemove = [SessionRegistrationStatus.Approved, SessionRegistrationStatus.Pending, SessionRegistrationStatus.WaitingList].includes(item.registrationStatus)
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Typography fontWeight={600}>
                                {getParticipantName(item)}
                              </Typography>
                              {!hasParticipantPreferredName(item) && (
                                <Typography variant="caption" color="text.secondary">{item.playerID}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={registrationStatusLabel[item.registrationStatus]} size="small" />
                            </TableCell>
                            <TableCell sx={{ minWidth: 160 }}>
                              <FormControl size="small" fullWidth>
                                <InputLabel>Payment</InputLabel>
                                <Select
                                  label="Payment"
                                  value={item.paymentStatus}
                                  disabled={rowBusy}
                                  onChange={(event) => {
                                    void withRowAction(item.id, async() => {
                                      await sessionsService.updatePaymentStatus(
                                        session.id,
                                        item.id,
                                        event.target.value as SessionRegistrationPaymentStatus,
                                      )
                                    })
                                  }}
                                >
                                  <MenuItem value={SessionRegistrationPaymentStatus.Pending}>Pending</MenuItem>
                                  <MenuItem value={SessionRegistrationPaymentStatus.Paid}>Paid</MenuItem>
                                  <MenuItem value={SessionRegistrationPaymentStatus.PartiallyPaid}>Partially paid</MenuItem>
                                  <MenuItem value={SessionRegistrationPaymentStatus.Refunded}>Refunded</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell sx={{ minWidth: 170 }}>
                              <FormControl size="small" fullWidth>
                                <InputLabel>Attendance</InputLabel>
                                <Select
                                  label="Attendance"
                                  value={item.attendanceStatus}
                                  disabled={rowBusy}
                                  onChange={(event) => {
                                    void withRowAction(item.id, async() => {
                                      await sessionsService.updateAttendanceStatus(
                                        session.id,
                                        item.id,
                                        event.target.value as SessionAttendanceStatus,
                                      )
                                    })
                                  }}
                                >
                                  <MenuItem value={SessionAttendanceStatus.Registered}>Registered</MenuItem>
                                  <MenuItem value={SessionAttendanceStatus.CheckedIn}>Checked in</MenuItem>
                                  <MenuItem value={SessionAttendanceStatus.NoShow}>No show</MenuItem>
                                  <MenuItem value={SessionAttendanceStatus.Cancelled}>Cancelled</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  onClick={() => {
                                    void withRowAction(item.id, async() => {
                                      await sessionsService.approveRegistration(session.id, item.id)
                                    })
                                  }}
                                  disabled={!canApprove || rowBusy}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  color="warning"
                                  onClick={() => {
                                    void withRowAction(item.id, async() => {
                                      await sessionsService.rejectRegistration(session.id, item.id)
                                    })
                                  }}
                                  disabled={!canReject || rowBusy}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    void withRowAction(item.id, async() => {
                                      await sessionsService.removeRegistration(session.id, item.id)
                                    })
                                  }}
                                  disabled={!canRemove || rowBusy}
                                >
                                  Remove
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {registrations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Typography color="text.secondary" sx={{ py: 2 }}>
                              No participants yet.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </Stack>
            </Paper>
          )}

          {isOrganizer && (
            <Dialog
              open={isCreatePlayerDialogOpen}
              onClose={() => {
                if (isCreatingPlayer) return
                setIsCreatePlayerDialogOpen(false)
              }}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>Create player</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Official name (EN)"
                    value={newPlayerForm.officialNameEn}
                    onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, officialNameEn: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Official name (TH)"
                    value={newPlayerForm.officialNameTh}
                    onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, officialNameTh: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Pronunciation"
                    value={newPlayerForm.pronunciation}
                    onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, pronunciation: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Display name (EN)"
                    value={newPlayerForm.displayNameEn}
                    onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, displayNameEn: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Display name (TH)"
                    value={newPlayerForm.displayNameTh}
                    onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, displayNameTh: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Club"
                    value={newPlayerForm.club}
                    onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, club: event.target.value }))}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel id="new-player-level-label">Level</InputLabel>
                    <Select
                      labelId="new-player-level-label"
                      label="Level"
                      value={String(newPlayerForm.level)}
                      onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, level: Number(event.target.value) }))}
                    >
                      <MenuItem value={0}>0</MenuItem>
                      <MenuItem value={1}>1</MenuItem>
                      <MenuItem value={2}>2</MenuItem>
                      <MenuItem value={3}>3</MenuItem>
                      <MenuItem value={4}>4</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  variant="outlined"
                  onClick={() => setIsCreatePlayerDialogOpen(false)}
                  disabled={isCreatingPlayer}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreatePlayerAndAdd}
                  disabled={isCreatingPlayer}
                >
                  {isCreatingPlayer ? 'Creating...' : 'Create & add'}
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </Stack>
      </Container>
    </Layout>
  )
}
