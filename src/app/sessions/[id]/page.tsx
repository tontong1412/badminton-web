'use client'

import Layout from '@/app/components/Layout'
import { useMySessionRegistration, usePlayers, useSession, useSessionMatches, useSessionStats } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import playersService from '@/app/services/players'
import sessionsService from '@/app/services/sessions'
import {
  NewPlayer,
  Player,
  SessionAttendanceStatus,
  SessionMatchStatus,
  SessionOpenPlayMatch,
  SessionPricingType,
  SessionRegistrationDetail,
  SessionRegistrationPaymentStatus,
  SessionPlayerStats,
  SessionRegistrationStatus,
  SessionStatus,
} from '@/type'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
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
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

const formatDurationMs = (durationMs?: number) => {
  if (durationMs === undefined) return '—'
  if (durationMs <= 0) return '0m'
  const totalMinutes = Math.floor(durationMs / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h ${totalMinutes % 60}m`
  const totalDays = Math.floor(totalHours / 24)
  return `${totalDays}d ${totalHours % 24}h`
}

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'inherit';
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
}

export default function SessionDetailPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSavingSession, setIsSavingSession] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [newPlayerForm, setNewPlayerForm] = useState({
    officialNameEn: '',
    officialNameTh: '',
    pronunciation: '',
    displayNameEn: '',
    displayNameTh: '',
    club: '',
    level: 0,
  })
  const [editForm, setEditForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    maxParticipants: 2,
    registrationOpen: true,
    requiresApproval: false,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
    pricingType: SessionPricingType.Fixed,
    pricingCurrency: 'EUR',
    fixedPrice: 0,
    courtRentalCost: 0,
    shuttlecockCost: 0,
    totalCost: 0,
    perPlayerCost: 0,
  })

  const isOrganizer = !!(session && user && session.organizerUserIDs.includes(user.id))

  const { matches, mutate: mutateMatches } = useSessionMatches(params.id, isOrganizer)
  const { stats: sessionStats, mutate: mutateSessionStats } = useSessionStats(params.id, isOrganizer)
  const sessionStatsByPlayerID = useMemo(() => {
    const statsMap: Record<string, SessionPlayerStats> = {}
    for (const stats of sessionStats?.players ?? []) {
      statsMap[stats.playerID] = stats
    }
    return statsMap
  }, [sessionStats])
  const [matchAction, setMatchAction] = useState<string | null>(null)
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<SessionOpenPlayMatch | null>(null)
  type MatchTeam = { playerIDs: string[] }
  const [matchForm, setMatchForm] = useState<{
    court: string;
    teams: [MatchTeam, MatchTeam];
    status: SessionMatchStatus;
  }>({ court: '', teams: [{ playerIDs: [] }, { playerIDs: [] }], status: SessionMatchStatus.Pending })
  const [isSavingMatch, setIsSavingMatch] = useState(false)

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

  const getParticipantWaitMs = (registration: SessionRegistrationDetail): number => {
    const playerStats = sessionStatsByPlayerID[registration.playerID]
    if (playerStats) {
      if (playerStats.currentlyPlaying) return 0
      return playerStats.waitSinceLastMatchMs ?? playerStats.currentWaitTimeMs ?? 0
    }

    // Queue/pending participants are not in match stats yet; use queue elapsed time.
    const queueElapsedMs = Date.now() - new Date(registration.registeredAt).getTime()
    return queueElapsedMs > 0 ? queueElapsedMs : 0
  }

  const sortedRegistrations = useMemo(() => {
    return [...registrations].sort((a, b) => {
      const waitDiff = getParticipantWaitMs(b) - getParticipantWaitMs(a)
      if (waitDiff !== 0) return waitDiff
      return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    })
  }, [registrations, sessionStatsByPlayerID])

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const aCreatedAt = new Date(a.createdAt).getTime()
      const bCreatedAt = new Date(b.createdAt).getTime()

      const aIsPending = a.status === SessionMatchStatus.Pending
      const bIsPending = b.status === SessionMatchStatus.Pending

      if (aIsPending && bIsPending) {
        return aCreatedAt - bCreatedAt
      }

      if (aIsPending !== bIsPending) {
        return aIsPending ? -1 : 1
      }

      const aIsPlayingOrCompleted = [SessionMatchStatus.Playing, SessionMatchStatus.Completed].includes(a.status)
      const bIsPlayingOrCompleted = [SessionMatchStatus.Playing, SessionMatchStatus.Completed].includes(b.status)

      if (aIsPlayingOrCompleted && bIsPlayingOrCompleted) {
        return bCreatedAt - aCreatedAt
      }

      return bCreatedAt - aCreatedAt
    })
  }, [matches])

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
    await Promise.all([mutateSessionData(), loadRegistrations(), mutateSessionStats()])
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

  const openConfirmDialog = (
    config: Omit<ConfirmDialogState, 'isSubmitting'>,
  ) => {
    setConfirmDialog({ ...config, isSubmitting: false })
  }

  const handleConfirmAction = async() => {
    if (!confirmDialog) return
    setConfirmDialog((prev) => prev ? { ...prev, isSubmitting: true } : prev)
    try {
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } catch {
      setConfirmDialog(null)
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

  const openEditDialog = () => {
    if (!session) return
    setOrganizerError(null)
    setEditForm({
      title: session.title,
      date: session.date.slice(0, 10),
      startTime: session.startTime,
      endTime: session.endTime,
      maxParticipants: session.maxParticipants,
      registrationOpen: session.registrationOpen,
      requiresApproval: session.requiresApproval,
      contactName: session.organizerContact.name,
      contactPhone: session.organizerContact.phone,
      contactEmail: session.organizerContact.email ?? '',
      notes: session.notes ?? '',
      pricingType: session.pricing.type,
      pricingCurrency: session.pricing.currency,
      fixedPrice: session.pricing.fixedPrice ?? 0,
      courtRentalCost: session.pricing.courtRentalCost ?? 0,
      shuttlecockCost: session.pricing.shuttlecockCost ?? 0,
      totalCost: session.pricing.totalCost ?? 0,
      perPlayerCost: session.pricing.perPlayerCost ?? 0,
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveSessionDetails = async() => {
    if (!session) return
    if (!editForm.title.trim()) {
      setOrganizerError('Session title is required.')
      return
    }
    if (!editForm.contactName.trim() || !editForm.contactPhone.trim()) {
      setOrganizerError('Organizer name and phone are required.')
      return
    }
    if (!editForm.pricingCurrency.trim()) {
      setOrganizerError('Pricing currency is required.')
      return
    }
    if (editForm.pricingType === SessionPricingType.Fixed && editForm.fixedPrice < 0) {
      setOrganizerError('Fixed price must be zero or greater.')
      return
    }
    if (editForm.pricingType === SessionPricingType.Shared && editForm.totalCost < 0) {
      setOrganizerError('Total cost must be zero or greater.')
      return
    }

    setOrganizerError(null)
    setIsSavingSession(true)
    try {
      const pricing = editForm.pricingType === SessionPricingType.Fixed
        ? {
          type: SessionPricingType.Fixed,
          fixedPrice: Number(editForm.fixedPrice),
          currency: editForm.pricingCurrency.trim(),
        }
        : {
          type: SessionPricingType.Shared,
          courtRentalCost: Number(editForm.courtRentalCost),
          shuttlecockCost: Number(editForm.shuttlecockCost),
          totalCost: Number(editForm.totalCost),
          perPlayerCost: Number(editForm.perPlayerCost),
          currency: editForm.pricingCurrency.trim(),
        }

      await sessionsService.update(session.id, {
        title: editForm.title.trim(),
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        maxParticipants: Number(editForm.maxParticipants),
        registrationOpen: editForm.registrationOpen,
        requiresApproval: editForm.requiresApproval,
        organizerContact: {
          name: editForm.contactName.trim(),
          phone: editForm.contactPhone.trim(),
          email: editForm.contactEmail.trim() || undefined,
        },
        notes: editForm.notes.trim() || undefined,
        pricing,
      })
      await refreshOrganizerData()
      setIsEditDialogOpen(false)
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to update session details right now.'))
    } finally {
      setIsSavingSession(false)
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

  // ── Match handlers ────────────────────────────────────────────────────────

  const withMatchAction = async(key: string, action: () => Promise<void>) => {
    setOrganizerError(null)
    setMatchAction(key)
    try {
      await action()
      await Promise.all([mutateMatches(), mutateSessionStats()])
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to update match right now.'))
    } finally {
      setMatchAction(null)
    }
  }

  const emptyMatchForm = () => ({
    court: `Court ${matches.length + 1}`,
    teams: [{ playerIDs: [] }, { playerIDs: [] }] as [{ playerIDs: string[] }, { playerIDs: string[] }],
    status: SessionMatchStatus.Pending,
  })

  const openNewMatchDialog = () => {
    setEditingMatch(null)
    setMatchForm(emptyMatchForm())
    setIsMatchDialogOpen(true)
  }

  const openEditMatchDialog = (match: SessionOpenPlayMatch) => {
    setEditingMatch(match)
    setMatchForm({
      court: match.court,
      teams: [
        { playerIDs: [...match.teams[0].playerIDs] },
        { playerIDs: [...match.teams[1].playerIDs] },
      ],
      status: match.status,
    })
    setIsMatchDialogOpen(true)
  }

  const handleSaveMatch = async() => {
    if (!params.id) return
    if (!matchForm.court.trim()) {
      setOrganizerError('Court name is required.')
      return
    }
    setIsSavingMatch(true)
    setOrganizerError(null)
    try {
      if (editingMatch) {
        await sessionsService.updateMatch(params.id, editingMatch.id, matchForm)
      } else {
        await sessionsService.createMatch(params.id, {
          court: matchForm.court,
          teams: matchForm.teams,
        })
      }
      await mutateMatches()
      setIsMatchDialogOpen(false)
    } catch (error) {
      setOrganizerError(getErrorMessage(error, 'Unable to save match right now.'))
    } finally {
      setIsSavingMatch(false)
    }
  }

  const handleAutoGenerateMatches = async() => {
    if (!params.id) return
    await withMatchAction('auto', async() => {
      await sessionsService.autoGenerateMatches(params.id)
    })
  }

  const handleDeleteMatch = async(matchID: string) => {
    if (!params.id) return
    await withMatchAction(`delete-${matchID}`, async() => {
      await sessionsService.deleteMatch(params.id, matchID)
    })
  }

  const handleQuickMatchStatus = async(matchID: string, status: SessionMatchStatus.Playing | SessionMatchStatus.Completed) => {
    if (!params.id) return
    await withMatchAction(`status-${matchID}-${status}`, async() => {
      await sessionsService.updateMatch(params.id, matchID, { status })
    })
  }

  // ── CSV export ────────────────────────────────────────────────────────────

  const downloadParticipantsCSV = () => {
    const rows = [
      ['Name', 'Status', 'Payment', 'Attendance', 'Level', 'Club', 'Matches', 'Wins', 'Losses', 'WaitSinceLastMatch'],
      ...sortedRegistrations.map((reg) => {
        const name = getParticipantName(reg)
        const playerStats = sessionStatsByPlayerID[reg.playerID]
        return [
          name,
          registrationStatusLabel[reg.registrationStatus],
          reg.paymentStatus,
          reg.attendanceStatus,
          String(reg.player?.level ?? ''),
          reg.player?.club ?? '',
          String(playerStats?.gamesPlayed ?? 0),
          String(playerStats?.wins ?? 0),
          String(playerStats?.losses ?? 0),
          formatDurationMs(playerStats?.waitSinceLastMatchMs),
        ]
      }),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `participants-${session?.title ?? params.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getMatchPlayerName = (playerID: string) => {
    const reg = registrations.find((item) => item.playerID === playerID)
    return reg ? getParticipantName(reg) : playerID
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
                      onClick={() => {
                        openConfirmDialog({
                          title: 'Cancel registration?',
                          message: 'Your seat will be released immediately. Continue?',
                          confirmLabel: 'Cancel registration',
                          confirmColor: 'error',
                          onConfirm: handleCancelRegistration,
                        })
                      }}
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
                    onClick={openEditDialog}
                    disabled={!!lifecycleAction || isSavingSession}
                  >
                    Edit details
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      openConfirmDialog({
                        title: 'Close registration?',
                        message: 'New players will not be able to register after this action.',
                        confirmLabel: 'Close registration',
                        confirmColor: 'warning',
                        onConfirm: () => handleLifecycleAction('close'),
                      })
                    }}
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
                    onClick={() => {
                      openConfirmDialog({
                        title: 'End session?',
                        message: 'This marks the session as completed. Continue?',
                        confirmLabel: 'End session',
                        confirmColor: 'warning',
                        onConfirm: () => handleLifecycleAction('end'),
                      })
                    }}
                    disabled={!!lifecycleAction || session.status !== SessionStatus.Ongoing}
                  >
                    {lifecycleAction === 'end' ? 'Ending...' : 'End session'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      openConfirmDialog({
                        title: 'Cancel session?',
                        message: 'This will cancel the session for all participants.',
                        confirmLabel: 'Cancel session',
                        confirmColor: 'error',
                        onConfirm: () => handleLifecycleAction('cancel'),
                      })
                    }}
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
                <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight={700}>Participants</Typography>
                  <Button
                    size="small"
                    startIcon={<FileDownloadOutlinedIcon />}
                    onClick={downloadParticipantsCSV}
                    disabled={registrations.length === 0}
                  >
                    Export CSV
                  </Button>
                </Box>
                {isLoadingRegistrations ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 980 }}>
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
                        {sortedRegistrations.map((item) => {
                          const playerStats = sessionStatsByPlayerID[item.playerID]
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
                                {item.player?.level != null && (
                                  <Typography variant="caption" color="text.secondary">
                                    {' · Lv.'}{item.player.level}
                                    {' · Matches: '}{playerStats?.gamesPlayed ?? 0}
                                    {' · Wait: '}
                                    {playerStats?.currentlyPlaying
                                      ? 'Playing now'
                                      : formatDurationMs(getParticipantWaitMs(item))}
                                  </Typography>
                                )}
                                {item.player?.level == null && (
                                  <Typography variant="caption" color="text.secondary">
                                    {'Matches: '}{playerStats?.gamesPlayed ?? 0}
                                    {' · '}
                                    {'Wait: '}
                                    {playerStats?.currentlyPlaying
                                      ? 'Playing now'
                                      : formatDurationMs(getParticipantWaitMs(item))}
                                  </Typography>
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
                                <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
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
                                      openConfirmDialog({
                                        title: 'Reject participant?',
                                        message: `This will move ${getParticipantName(item)} to rejected status.`,
                                        confirmLabel: 'Reject participant',
                                        confirmColor: 'warning',
                                        onConfirm: async() => {
                                          await withRowAction(item.id, async() => {
                                            await sessionsService.rejectRegistration(session.id, item.id)
                                          })
                                        },
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
                                      openConfirmDialog({
                                        title: 'Remove participant?',
                                        message: `${getParticipantName(item)} will be removed from this session.`,
                                        confirmLabel: 'Remove participant',
                                        confirmColor: 'error',
                                        onConfirm: async() => {
                                          await withRowAction(item.id, async() => {
                                            await sessionsService.removeRegistration(session.id, item.id)
                                          })
                                        },
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
                        {sortedRegistrations.length === 0 && (
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
                  </Box>
                )}
              </Stack>
            </Paper>
          )}

          {isOrganizer && (
            <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
              <Stack>
                <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" fontWeight={700}>Matches</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAutoGenerateMatches}
                      disabled={matchAction === 'auto'}
                    >
                      {matchAction === 'auto' ? 'Generating...' : 'Auto-generate'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={openNewMatchDialog}
                      disabled={matchAction === 'auto'}
                    >
                      Add match
                    </Button>
                  </Stack>
                </Box>

                {sortedMatches.length === 0 ? (
                  <Box sx={{ px: 3, pb: 3 }}>
                    <Typography color="text.secondary">No matches yet. Add one or auto-generate from participants.</Typography>
                  </Box>
                ) : isMobile ? (
                  <Stack spacing={1.5} sx={{ px: 2, pb: 2 }}>
                    {sortedMatches.map((match) => {
                      const team1Names = match.teams[0]?.playerIDs.map(getMatchPlayerName).join(' / ') || '—'
                      const team2Names = match.teams[1]?.playerIDs.map(getMatchPlayerName).join(' / ') || '—'
                      const matchBusy =
                        matchAction === `delete-${match.id}`
                        || matchAction === `status-${match.id}-${SessionMatchStatus.Playing}`
                        || matchAction === `status-${match.id}-${SessionMatchStatus.Completed}`
                      return (
                        <Paper key={match.id} variant="outlined" sx={{ p: 1.5, opacity: match.status === SessionMatchStatus.Skipped ? 0.5 : 1 }}>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                              <Typography fontWeight={700}>{match.court}</Typography>
                              <Chip
                                label={match.status}
                                size="small"
                                color={
                                  match.status === SessionMatchStatus.Playing ? 'success'
                                    : match.status === SessionMatchStatus.Skipped ? 'default'
                                      : match.status === SessionMatchStatus.Completed ? 'primary'
                                        : 'warning'
                                }
                              />
                            </Stack>
                            <Typography variant="body2"><strong>Team 1:</strong> {team1Names}</Typography>
                            <Typography variant="body2"><strong>Team 2:</strong> {team2Names}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => {
                                  void handleQuickMatchStatus(match.id, SessionMatchStatus.Playing)
                                }}
                                disabled={matchBusy || match.status === SessionMatchStatus.Playing}
                              >
                                Set playing
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => {
                                  void handleQuickMatchStatus(match.id, SessionMatchStatus.Completed)
                                }}
                                disabled={matchBusy || match.status === SessionMatchStatus.Completed}
                              >
                                Set completed
                              </Button>
                              <Button size="small" onClick={() => openEditMatchDialog(match)} disabled={matchBusy}>Edit</Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => {
                                  openConfirmDialog({
                                    title: 'Remove match?',
                                    message: `Remove the match on ${match.court}?`,
                                    confirmLabel: 'Remove',
                                    confirmColor: 'error',
                                    onConfirm: () => handleDeleteMatch(match.id),
                                  })
                                }}
                                disabled={matchBusy}
                              >
                                Remove
                              </Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      )
                    })}
                  </Stack>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 760 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Court</TableCell>
                          <TableCell>Team 1</TableCell>
                          <TableCell>Team 2</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedMatches.map((match) => {
                          const team1Names = match.teams[0]?.playerIDs.map(getMatchPlayerName).join(' / ') || '—'
                          const team2Names = match.teams[1]?.playerIDs.map(getMatchPlayerName).join(' / ') || '—'
                          const matchBusy = matchAction === `delete-${match.id}`
                          return (
                            <TableRow key={match.id} hover sx={{ opacity: match.status === SessionMatchStatus.Skipped ? 0.5 : 1 }}>
                              <TableCell>{match.court}</TableCell>
                              <TableCell>{team1Names}</TableCell>
                              <TableCell>{team2Names}</TableCell>
                              <TableCell>
                                <Chip
                                  label={match.status}
                                  size="small"
                                  color={
                                    match.status === SessionMatchStatus.Playing ? 'success'
                                      : match.status === SessionMatchStatus.Skipped ? 'default'
                                        : match.status === SessionMatchStatus.Completed ? 'primary'
                                          : 'warning'
                                  }
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                                  <Button size="small" onClick={() => openEditMatchDialog(match)} disabled={matchBusy}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      openConfirmDialog({
                                        title: 'Remove match?',
                                        message: `Remove the match on ${match.court}?`,
                                        confirmLabel: 'Remove',
                                        confirmColor: 'error',
                                        onConfirm: () => handleDeleteMatch(match.id),
                                      })
                                    }}
                                    disabled={matchBusy}
                                  >
                                    Remove
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Stack>
            </Paper>
          )}

          {isOrganizer && (
            <Dialog
              open={isMatchDialogOpen}
              onClose={() => {
                if (isSavingMatch) return
                setIsMatchDialogOpen(false)
              }}
              fullScreen={isMobile}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>{editingMatch ? 'Edit match' : 'Add match'}</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Court name"
                    size="small"
                    value={matchForm.court}
                    onChange={(e) => setMatchForm((prev) => ({ ...prev, court: e.target.value }))}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {([0, 1] as const).map((teamIndex) => (
                      <Box key={teamIndex} flex={1}>
                        <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                          Team {teamIndex + 1}
                        </Typography>
                        <Stack spacing={1}>
                          {[0, 1].map((slot) => {
                            const currentID = matchForm.teams[teamIndex]?.playerIDs[slot] ?? ''
                            const approvedRegs = registrations.filter(
                              (r) => r.registrationStatus === SessionRegistrationStatus.Approved,
                            )
                            return (
                              <FormControl key={slot} size="small" fullWidth>
                                <InputLabel>Player {slot + 1}</InputLabel>
                                <Select
                                  label={`Player ${slot + 1}`}
                                  value={currentID}
                                  onChange={(e) => {
                                    const newID = e.target.value
                                    setMatchForm((prev) => {
                                      const newTeams = [
                                        { playerIDs: [...prev.teams[0].playerIDs] },
                                        { playerIDs: [...prev.teams[1].playerIDs] },
                                      ] as typeof prev.teams
                                      const ids = [...(newTeams[teamIndex].playerIDs)]
                                      ids[slot] = newID
                                      newTeams[teamIndex] = { playerIDs: ids.filter(Boolean) }
                                      return { ...prev, teams: newTeams }
                                    })
                                  }}
                                >
                                  <MenuItem value=""><em>— unassigned —</em></MenuItem>
                                  {approvedRegs.map((reg) => (
                                    <MenuItem key={reg.id} value={reg.playerID}>
                                      {getParticipantName(reg)}
                                      {reg.player?.level != null ? ` (Lv.${reg.player.level})` : ''}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )
                          })}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                  {editingMatch && (
                    <FormControl size="small" sx={{ maxWidth: 200 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        label="Status"
                        value={matchForm.status}
                        onChange={(e) => setMatchForm((prev) => ({ ...prev, status: e.target.value as SessionMatchStatus }))}
                      >
                        <MenuItem value={SessionMatchStatus.Pending}>Pending</MenuItem>
                        <MenuItem value={SessionMatchStatus.Playing}>Playing</MenuItem>
                        <MenuItem value={SessionMatchStatus.Completed}>Completed</MenuItem>
                        <MenuItem value={SessionMatchStatus.Skipped}>Skipped</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button variant="outlined" onClick={() => setIsMatchDialogOpen(false)} disabled={isSavingMatch}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleSaveMatch} disabled={isSavingMatch}>
                  {isSavingMatch ? 'Saving...' : editingMatch ? 'Save changes' : 'Add match'}
                </Button>
              </DialogActions>
            </Dialog>
          )}

          {isOrganizer && (
            <Dialog
              open={isEditDialogOpen}
              onClose={() => {
                if (isSavingSession) return
                setIsEditDialogOpen(false)
              }}
              fullScreen={isMobile}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>Edit session details</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Title"
                    value={editForm.title}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label="Date"
                      type="date"
                      value={editForm.date}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, date: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="Start time"
                      type="time"
                      value={editForm.startTime}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, startTime: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="End time"
                      type="time"
                      value={editForm.endTime}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, endTime: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Max participants"
                    type="number"
                    inputProps={{ min: 2 }}
                    value={editForm.maxParticipants}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, maxParticipants: Number(event.target.value) || 2 }))}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <FormControlLabel
                      control={<Switch
                        checked={editForm.registrationOpen}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, registrationOpen: event.target.checked }))}
                      />}
                      label="Registration open"
                    />
                    <FormControlLabel
                      control={<Switch
                        checked={editForm.requiresApproval}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, requiresApproval: event.target.checked }))}
                      />}
                      label="Requires approval"
                    />
                  </Stack>
                  <TextField
                    label="Organizer name"
                    value={editForm.contactName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, contactName: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Organizer phone"
                    value={editForm.contactPhone}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Organizer email"
                    value={editForm.contactEmail}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                    fullWidth
                  />
                  <Divider />
                  <Typography variant="subtitle1" fontWeight={700}>Pricing</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <FormControl fullWidth>
                      <InputLabel id="edit-pricing-type-label">Pricing type</InputLabel>
                      <Select
                        labelId="edit-pricing-type-label"
                        label="Pricing type"
                        value={editForm.pricingType}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, pricingType: event.target.value as SessionPricingType }))}
                      >
                        <MenuItem value={SessionPricingType.Fixed}>Fixed</MenuItem>
                        <MenuItem value={SessionPricingType.Shared}>Shared</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Currency"
                      value={editForm.pricingCurrency}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, pricingCurrency: event.target.value }))}
                      fullWidth
                    />
                  </Stack>

                  {editForm.pricingType === SessionPricingType.Fixed ? (
                    <TextField
                      label="Fixed price"
                      type="number"
                      inputProps={{ min: 0 }}
                      value={editForm.fixedPrice}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, fixedPrice: Number(event.target.value) || 0 }))}
                      fullWidth
                    />
                  ) : (
                    <Stack spacing={1.5}>
                      <TextField
                        label="Court rental cost"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={editForm.courtRentalCost}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, courtRentalCost: Number(event.target.value) || 0 }))}
                        fullWidth
                      />
                      <TextField
                        label="Shuttlecock cost"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={editForm.shuttlecockCost}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, shuttlecockCost: Number(event.target.value) || 0 }))}
                        fullWidth
                      />
                      <TextField
                        label="Total cost"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={editForm.totalCost}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, totalCost: Number(event.target.value) || 0 }))}
                        fullWidth
                      />
                      <TextField
                        label="Per-player cost"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={editForm.perPlayerCost}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, perPlayerCost: Number(event.target.value) || 0 }))}
                        fullWidth
                      />
                    </Stack>
                  )}

                  <TextField
                    label="Notes"
                    value={editForm.notes}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  variant="outlined"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSavingSession}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveSessionDetails}
                  disabled={isSavingSession}
                >
                  {isSavingSession ? 'Saving...' : 'Save changes'}
                </Button>
              </DialogActions>
            </Dialog>
          )}

          {isOrganizer && (
            <Dialog
              open={isCreatePlayerDialogOpen}
              onClose={() => {
                if (isCreatingPlayer) return
                setIsCreatePlayerDialogOpen(false)
              }}
              fullScreen={isMobile}
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

          <Dialog
            open={!!confirmDialog}
            onClose={() => {
              if (confirmDialog?.isSubmitting) return
              setConfirmDialog(null)
            }}
            fullScreen={isMobile}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle>{confirmDialog?.title}</DialogTitle>
            <DialogContent>
              <DialogContentText>{confirmDialog?.message}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                variant="outlined"
                onClick={() => setConfirmDialog(null)}
                disabled={!!confirmDialog?.isSubmitting}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color={confirmDialog?.confirmColor ?? 'primary'}
                onClick={handleConfirmAction}
                disabled={!!confirmDialog?.isSubmitting}
              >
                {confirmDialog?.isSubmitting ? 'Please wait...' : (confirmDialog?.confirmLabel ?? 'Confirm')}
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Container>
    </Layout>
  )
}
