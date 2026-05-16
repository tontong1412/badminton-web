'use client'

import { useEffect, useState } from 'react'
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  MenuItem,
  Paper,
  IconButton,
  Tooltip,
  Autocomplete,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import venueService, { CreateVenuePayload } from '@/app/services/venues'
import Layout from '@/app/components/Layout'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { PlayerWithAccount } from '@/type'

const DAYS = [
  { key: '1', label: 'Monday' },
  { key: '2', label: 'Tuesday' },
  { key: '3', label: 'Wednesday' },
  { key: '4', label: 'Thursday' },
  { key: '5', label: 'Friday' },
  { key: '6', label: 'Saturday' },
  { key: '0', label: 'Sunday' },
]

interface DaySchedule {
  enabled: boolean
  open: string
  close: string
}

const defaultDay = (): DaySchedule => ({ enabled: true, open: '09:00', close: '22:00' })

export default function NewVenuePage() {
  const router = useRouter()
  const user = useSelector((state: RootState) => state.app.user)
  const userReady = useSelector((state: RootState) => state.app.userReady)

  // Players with accounts
  const [players, setPlayers] = useState<PlayerWithAccount[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithAccount | null>(null)

  // Basic info
  const [nameTh, setNameTh] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    axios
      .get<PlayerWithAccount[]>(`${SERVICE_ENDPOINT}/players/with-account`, { withCredentials: true })
      .then((r) => setPlayers(r.data))
      .catch(() => setPlayers([]))
  }, [])

  // Location (optional)
  const [longitude, setLongitude] = useState('')
  const [latitude, setLatitude] = useState('')

  // Weekly schedule
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(DAYS.map((d) => [d.key, defaultDay()]))
  )

  // Gap policy
  const [gapEnabled, setGapEnabled] = useState(true)
  const [gapMinutes, setGapMinutes] = useState<30 | 60>(60)

  // Slot duration
  const [slotDuration, setSlotDuration] = useState<30 | 60>(60)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userReady && (!user || (user as { role?: string }).role !== 'admin')) router.replace('/')
  }, [userReady, user, router])

  const updateDay = (key: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nameTh.trim() || !nameEn.trim() || !address.trim() || !selectedPlayer) {
      setError('Name (TH), Name (EN), Address, and Owner are required.')
      return
    }

    const weeklySchedule: Record<string, { open: string; close: string } | null> = {}
    for (const day of DAYS) {
      const d = schedule[day.key]
      weeklySchedule[day.key] = d.enabled ? { open: d.open, close: d.close } : null
    }

    const payload: CreateVenuePayload = {
      name: { th: nameTh.trim(), en: nameEn.trim() },
      address: address.trim(),
      ownerUserID: selectedPlayer.userID,
      weeklySchedule,
      gapPolicy: { enabled: gapEnabled, minimumGapMinutes: gapMinutes },
      slotDurationMinutes: slotDuration,
    }

    if (longitude && latitude) {
      const lng = parseFloat(longitude)
      const lat = parseFloat(latitude)
      if (isNaN(lng) || isNaN(lat)) {
        setError('Longitude and latitude must be valid numbers.')
        return
      }
      payload.location = { type: 'Point', coordinates: [lng, lat] }
    }

    try {
      setSubmitting(true)
      const venue = await venueService.create(payload)
      router.push(`/venues/${venue.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create venue.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {!userReady ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Tooltip title="Back to Admin">
                <IconButton onClick={() => router.back()} size="small">
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="h5" fontWeight={700}>
                Create New Venue
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              {/* ── Basic Info ─────────────────────────────────────── */}
              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Basic Information
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <TextField
                    label="Name (Thai)"
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                    required
                    sx={{ flex: '1 1 220px' }}
                    size="small"
                  />
                  <TextField
                    label="Name (English)"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    required
                    sx={{ flex: '1 1 220px' }}
                    size="small"
                  />
                </Box>
                <TextField
                  label="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Autocomplete<PlayerWithAccount>
                  options={players}
                  value={selectedPlayer}
                  onChange={(_e, val) => setSelectedPlayer(val)}
                  getOptionLabel={(p) =>
                    `${p.officialName?.en || p.officialName?.th || ''} (${p.club || ''})`
                  }
                  isOptionEqualToValue={(a, b) => a.userID === b.userID}
                  renderOption={(props, p) => (
                    <li {...props} key={p.id}>
                      {p.officialName?.en || p.officialName?.th || p.id} {p.club ? `(${p.club})` : ''}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Owner"
                      size="small"
                      required
                      helperText="Players who have a registered account"
                    />
                  )}
                />
              </Paper>

              {/* ── Location ───────────────────────────────────────── */}
              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Location (optional)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="Longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    sx={{ flex: '1 1 200px' }}
                    size="small"
                    placeholder="e.g. 98.962016"
                  />
                  <TextField
                    label="Latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    sx={{ flex: '1 1 200px' }}
                    size="small"
                    placeholder="e.g. 18.841274"
                  />
                </Box>
              </Paper>

              {/* ── Weekly Schedule ────────────────────────────────── */}
              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Weekly Schedule
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {DAYS.map((day) => {
                    const d = schedule[day.key]
                    return (
                      <Box key={day.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={d.enabled}
                              onChange={(e) => updateDay(day.key, 'enabled', e.target.checked)}
                              size="small"
                            />
                          }
                          label={<Typography sx={{ width: 90, fontWeight: d.enabled ? 600 : 400 }}>{day.label}</Typography>}
                          sx={{ m: 0, minWidth: 140 }}
                        />
                        {d.enabled && (
                          <>
                            <TextField
                              label="Open"
                              type="time"
                              value={d.open}
                              onChange={(e) => updateDay(day.key, 'open', e.target.value)}
                              size="small"
                              sx={{ width: 130 }}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                              label="Close"
                              type="time"
                              value={d.close}
                              onChange={(e) => updateDay(day.key, 'close', e.target.value)}
                              size="small"
                              sx={{ width: 130 }}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />
                          </>
                        )}
                        {!d.enabled && (
                          <Typography variant="body2" color="text.secondary">Closed</Typography>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Paper>

              {/* ── Booking Settings ───────────────────────────────── */}
              <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Booking Settings
                </Typography>

                <TextField
                  select
                  label="Slot Duration"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value) as 30 | 60)}
                  size="small"
                  sx={{ minWidth: 180, mb: 2 }}
                  helperText="Minimum booking unit"
                >
                  <MenuItem value={30}>30 minutes</MenuItem>
                  <MenuItem value={60}>60 minutes</MenuItem>
                </TextField>

                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={gapEnabled}
                      onChange={(e) => setGapEnabled(e.target.checked)}
                    />
                  }
                  label="Enable gap between bookings"
                  sx={{ mb: 1, display: 'flex' }}
                />

                {gapEnabled && (
                  <TextField
                    select
                    label="Minimum Gap"
                    value={gapMinutes}
                    onChange={(e) => setGapMinutes(Number(e.target.value) as 30 | 60)}
                    size="small"
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>60 minutes</MenuItem>
                  </TextField>
                )}
              </Paper>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => router.back()} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={16} /> : undefined}
                >
                  {submitting ? 'Creating…' : 'Create Venue'}
                </Button>
              </Box>
            </form>
          </>
        )}
      </Container>
    </Layout>
  )
}
