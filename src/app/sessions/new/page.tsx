'use client'

import { useMyPlayer, useVenues } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import Layout from '@/app/components/Layout'
import sessionsService from '@/app/services/sessions'
import {
  SessionPricingType,
  SessionType,
  Venue,
} from '@/type'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

const today = new Date().toISOString().slice(0, 10)

const getVenueLabel = (venue: Venue) => venue.name.en || venue.name.th || venue.id

export default function NewSessionPage() {
  const router = useRouter()
  const user = useSelector((state: RootState) => state.app.user)
  const userReady = useSelector((state: RootState) => state.app.userReady)
  const { venues, isLoading: venuesLoading, isError: venuesError } = useVenues()
  const { player } = useMyPlayer(Boolean(user))

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('22:00')
  const [venueID, setVenueID] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('16')
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [pricingType, setPricingType] = useState<SessionPricingType>(SessionPricingType.Fixed)
  const [fixedPrice, setFixedPrice] = useState('8')
  const [courtRentalCost, setCourtRentalCost] = useState('48')
  const [shuttlecockCost, setShuttlecockCost] = useState('16')
  const [currency, setCurrency] = useState('EUR')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!contactName && user?.player) {
      setContactName(user.player.displayName?.en || user.player.displayName?.th || user.player.officialName?.en || user.player.officialName?.th || '')
    }
  }, [contactName, user])

  useEffect(() => {
    if (!contactPhone && player?.contact?.tel) {
      setContactPhone(player.contact.tel)
    }
  }, [contactPhone, player])

  useEffect(() => {
    if (!contactEmail && user?.email) {
      setContactEmail(user.email)
    }
  }, [contactEmail, user])

  useEffect(() => {
    if (userReady && !user) {
      router.replace('/sessions')
    }
  }, [router, user, userReady])

  const totalSharedCost = useMemo(() => {
    const court = Number(courtRentalCost || 0)
    const shuttles = Number(shuttlecockCost || 0)
    return Number((court + shuttles).toFixed(2))
  }, [courtRentalCost, shuttlecockCost])

  const estimatedSharedPerPlayer = useMemo(() => {
    const capacity = Number(maxParticipants || 0)
    if (capacity <= 0) return 0
    return Number((totalSharedCost / capacity).toFixed(2))
  }, [maxParticipants, totalSharedCost])

  const handleSubmit = async(event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!title.trim() || !venueID || !contactName.trim() || !contactPhone.trim()) {
      setError('Title, venue, contact name, and contact phone are required.')
      return
    }

    if (startTime >= endTime) {
      setError('End time must be after start time.')
      return
    }

    const parsedMaxParticipants = Number(maxParticipants)
    if (!Number.isInteger(parsedMaxParticipants) || parsedMaxParticipants <= 0) {
      setError('Maximum participants must be a positive whole number.')
      return
    }

    if (pricingType === SessionPricingType.Fixed && Number(fixedPrice) < 0) {
      setError('Fixed price must be zero or greater.')
      return
    }

    if (pricingType === SessionPricingType.Shared && totalSharedCost < 0) {
      setError('Shared costs must be zero or greater.')
      return
    }

    try {
      setSubmitting(true)

      const session = await sessionsService.create({
        type: SessionType.OpenPlay,
        title: title.trim(),
        date,
        startTime,
        endTime,
        venueID,
        maxParticipants: parsedMaxParticipants,
        registrationOpen,
        organizerContact: {
          name: contactName.trim(),
          phone: contactPhone.trim(),
          email: contactEmail.trim() || undefined,
        },
        notes: notes.trim() || undefined,
        requiresApproval,
        pricing: pricingType === SessionPricingType.Fixed
          ? {
            type: SessionPricingType.Fixed,
            fixedPrice: Number(fixedPrice),
            currency,
          }
          : {
            type: SessionPricingType.Shared,
            courtRentalCost: Number(courtRentalCost),
            shuttlecockCost: Number(shuttlecockCost),
            totalCost: totalSharedCost,
            currency,
          },
      })

      router.push(`/sessions/${session.id}`)
    } catch (submitError) {
      const message = typeof submitError === 'object' && submitError !== null && 'response' in submitError
        ? String((submitError as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error
          ?? (submitError as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message
          ?? 'Failed to create session.')
        : submitError instanceof Error ? submitError.message : 'Failed to create session.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!userReady) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    )
  }

  if (!user) {
    return <Layout><></></Layout>
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Back to sessions">
              <IconButton onClick={() => router.push('/sessions')} size="small">
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Box>
              <Typography variant="h4" fontWeight={700}>Create Open Play Session</Typography>
              <Typography color="text.secondary">Set up a new session and publish it directly to players.</Typography>
            </Box>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {venuesError && <Alert severity="warning">Unable to refresh venues right now. Existing venue data may be incomplete.</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Basic information</Typography>
                  <TextField
                    label="Session title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    fullWidth
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Session date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Start time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                      required
                    />
                    <TextField
                      label="End time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                      required
                    />
                  </Stack>

                  <TextField
                    select
                    label="Venue"
                    value={venueID}
                    onChange={(e) => setVenueID(e.target.value)}
                    required
                    fullWidth
                    disabled={venuesLoading}
                    helperText="Sessions currently use existing venue records only."
                  >
                    {venues.map((venue) => (
                      <MenuItem key={venue.id} value={venue.id}>{getVenueLabel(venue)}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Maximum participants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    inputProps={{ min: 1, step: 1 }}
                    required
                    sx={{ maxWidth: 220 }}
                  />

                  <TextField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Organizer</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Contact name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Contact phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Contact email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    fullWidth
                  />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Registration settings</Typography>
                  <FormControlLabel
                    control={<Switch checked={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.checked)} />}
                    label="Open registration immediately"
                  />
                  <FormControlLabel
                    control={<Switch checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />}
                    label="Require organizer approval before joining"
                  />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Pricing</Typography>
                  <TextField
                    select
                    label="Pricing type"
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value as SessionPricingType)}
                    sx={{ maxWidth: 260 }}
                  >
                    <MenuItem value={SessionPricingType.Fixed}>Fixed price</MenuItem>
                    <MenuItem value={SessionPricingType.Shared}>Shared cost</MenuItem>
                  </TextField>

                  <TextField
                    label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    sx={{ maxWidth: 200 }}
                  />

                  {pricingType === SessionPricingType.Fixed ? (
                    <TextField
                      label="Fixed price per player"
                      type="number"
                      value={fixedPrice}
                      onChange={(e) => setFixedPrice(e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ maxWidth: 240 }}
                    />
                  ) : (
                    <>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Court rental cost"
                          type="number"
                          value={courtRentalCost}
                          onChange={(e) => setCourtRentalCost(e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          fullWidth
                        />
                        <TextField
                          label="Shuttlecock cost"
                          type="number"
                          value={shuttlecockCost}
                          onChange={(e) => setShuttlecockCost(e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          fullWidth
                        />
                      </Stack>

                      <Divider />

                      <Stack spacing={1}>
                        <Typography>Total shared cost: {currency} {totalSharedCost}</Typography>
                        <Typography color="text.secondary">
                          Estimated per-player cost at full capacity: {currency} {estimatedSharedPerPlayer}
                        </Typography>
                      </Stack>
                    </>
                  )}
                </Stack>
              </Paper>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="outlined" onClick={() => router.push('/sessions')} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={submitting || venuesLoading}>
                  {submitting ? 'Creating session...' : 'Create session'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Stack>
      </Container>
    </Layout>
  )
}