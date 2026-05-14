'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Chip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { Autocomplete } from '@mui/material'
import { HolidaySchedule, PlayerWithAccount, User, Venue } from '@/type'
import venueService from '../../../../services/venues'
import playerService from '../../../../services/players'
import moment from 'moment'
import { useParams, useRouter } from 'next/navigation'
import Layout from '../../../../components/Layout/index'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../libs/redux/store'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DayScheduleState {
  isOpen: boolean;
  open: string;
  close: string;
}

export default function VenueSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const venueID = params.id as string
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)

  const [venue, setVenue] = useState<Venue | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // General info state
  const [nameTH, setNameTH] = useState('')
  const [nameEN, setNameEN] = useState('')
  const [address, setAddress] = useState('')
  const [generalSaving, setGeneralSaving] = useState(false)
  const [generalSuccess, setGeneralSuccess] = useState(false)

  // Photos & branding state
  const [coverImage, setCoverImage] = useState('')
  const [logo, setLogo] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverSuccess, setCoverSuccess] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoSuccess, setLogoSuccess] = useState(false)

  // Manager state
  const [managerUserIDs, setManagerUserIDs] = useState<string[]>([])
  const [allPlayers, setAllPlayers] = useState<PlayerWithAccount[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithAccount | null>(null)
  const [managerAdding, setManagerAdding] = useState(false)
  const [managerError, setManagerError] = useState<string | null>(null)

  // Weekly schedule state
  const [weekDays, setWeekDays] = useState<DayScheduleState[]>(
    Array.from({ length: 7 }, () => ({ isOpen: true, open: '08:00', close: '22:00' }))
  )
  const [slotDuration, setSlotDuration] = useState<30 | 60>(30)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)

  // Gap policy state
  const [gapEnabled, setGapEnabled] = useState(true)
  const [gapMinutes, setGapMinutes] = useState<30 | 60>(60)
  const [gapSaving, setGapSaving] = useState(false)
  const [gapSuccess, setGapSuccess] = useState(false)

  // Payment state
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [promptPayID, setPromptPayID] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Holidays state
  const [holidays, setHolidays] = useState<HolidaySchedule[]>([])
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayIsClosed, setNewHolidayIsClosed] = useState(true)
  const [newHolidayOpen, setNewHolidayOpen] = useState('08:00')
  const [newHolidayClose, setNewHolidayClose] = useState('22:00')
  const [holidaySaving, setHolidaySaving] = useState(false)
  const [holidayError, setHolidayError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const v = await venueService.getById(venueID)
        const userID = (user as unknown as { id: string } | null)?.id
        const isOwner = v.ownerUserID === userID
        const isManager = v.managerUserIDs.includes(userID ?? '')
        if (!userReady) return
        if (!userID || (!isOwner && !isManager)) {
          router.replace('/admin')
          return
        }

        setVenue(v)
        setNameTH(v.name.th)
        setNameEN(v.name.en)
        setAddress(v.address)
        setCoverImage(v.coverImage ?? '')
        setLogo(v.logo ?? '')
        setManagerUserIDs(v.managerUserIDs ?? [])

        // Weekly schedule
        const days: DayScheduleState[] = Array.from({ length: 7 }, (_, i) => {
          const entry = v.weeklySchedule?.[String(i)]
          return entry
            ? { isOpen: true, open: entry.open, close: entry.close }
            : { isOpen: false, open: '08:00', close: '22:00' }
        })
        setWeekDays(days)
        setSlotDuration((v.slotDurationMinutes as 30 | 60) ?? 30)

        setGapEnabled(v.gapPolicy?.enabled ?? true)
        setGapMinutes((v.gapPolicy?.minimumGapMinutes as 30 | 60) ?? 60)

        setBankName(v.payment?.bankName ?? '')
        setAccountNumber(v.payment?.accountNumber ?? '')
        setAccountName(v.payment?.accountName ?? '')
        setPromptPayID(v.payment?.promptPayID ?? '')

        setHolidays(v.holidays ?? [])
      } catch (e) {
        setError('Failed to load venue settings')
        console.error(e)
      } finally {
        setInitLoading(false)
      }
    }
    init()
  }, [venueID, user, userReady, router])

  // Load players with accounts for manager search
  useEffect(() => {
    playerService.getWithAccount().then(setAllPlayers).catch(() => {/* non-critical */})
  }, [])

  const handleAddManager = async () => {
    if (!selectedPlayer) return
    setManagerAdding(true)
    setManagerError(null)
    try {
      const updated = await venueService.addManager(venueID, selectedPlayer.userID)
      setManagerUserIDs(updated.managerUserIDs)
      setSelectedPlayer(null)
    } catch (e) {
      setManagerError('Failed to add manager')
      console.error(e)
    } finally {
      setManagerAdding(false)
    }
  }

  const handleRemoveManager = async (userID: string) => {
    setManagerError(null)
    try {
      const updated = await venueService.removeManager(venueID, userID)
      setManagerUserIDs(updated.managerUserIDs)
    } catch (e) {
      setManagerError('Failed to remove manager')
      console.error(e)
    }
  }

  const handleSaveGeneral = async () => {
    setGeneralSaving(true)
    setGeneralSuccess(false)
    setError(null)
    try {
      const updated = await venueService.update(venueID, {
        name: { th: nameTH, en: nameEN },
        address,
      })
      setVenue(updated)
      setGeneralSuccess(true)
      setTimeout(() => setGeneralSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save general info')
      console.error(e)
    } finally {
      setGeneralSaving(false)
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleUploadCover = async (file: File) => {
    setCoverUploading(true)
    setCoverSuccess(false)
    setError(null)
    try {
      const base64 = await readFileAsBase64(file)
      const updated = await venueService.uploadImage(venueID, 'coverImage', base64)
      setVenue(updated)
      setCoverImage(updated.coverImage ?? '')
      setCoverSuccess(true)
      setTimeout(() => setCoverSuccess(false), 3000)
    } catch (e) {
      setError('Failed to upload cover photo')
      console.error(e)
    } finally {
      setCoverUploading(false)
    }
  }

  const handleUploadLogo = async (file: File) => {
    setLogoUploading(true)
    setLogoSuccess(false)
    setError(null)
    try {
      const base64 = await readFileAsBase64(file)
      const updated = await venueService.uploadImage(venueID, 'logo', base64)
      setVenue(updated)
      setLogo(updated.logo ?? '')
      setLogoSuccess(true)
      setTimeout(() => setLogoSuccess(false), 3000)
    } catch (e) {
      setError('Failed to upload logo')
      console.error(e)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleSaveSchedule = async () => {
    setScheduleSaving(true)
    setScheduleSuccess(false)
    setError(null)
    try {
      const weeklySchedule: Record<string, { open: string; close: string } | null> = {}
      weekDays.forEach((day, i) => {
        weeklySchedule[String(i)] = day.isOpen ? { open: day.open, close: day.close } : null
      })

      await Promise.all([
        venueService.setSchedule(venueID, { weeklySchedule }),
        venueService.update(venueID, { slotDurationMinutes: slotDuration } as Partial<Venue>),
      ])
      setScheduleSuccess(true)
      setTimeout(() => setScheduleSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save schedule')
      console.error(e)
    } finally {
      setScheduleSaving(false)
    }
  }

  const handleSaveGapPolicy = async () => {
    setGapSaving(true)
    setGapSuccess(false)
    setError(null)
    try {
      const updated = await venueService.setSchedule(venueID, {
        gapPolicy: { enabled: gapEnabled, minimumGapMinutes: gapMinutes },
      })
      setVenue(updated)
      setGapSuccess(true)
      setTimeout(() => setGapSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save gap policy')
      console.error(e)
    } finally {
      setGapSaving(false)
    }
  }

  const handleSavePayment = async () => {
    setPaymentSaving(true)
    setPaymentSuccess(false)
    setError(null)
    try {
      const updated = await venueService.update(venueID, {
        payment: { bankName, accountNumber, accountName, promptPayID },
      } as Partial<Venue>)
      setVenue(updated)
      setPaymentSuccess(true)
      setTimeout(() => setPaymentSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save payment info')
      console.error(e)
    } finally {
      setPaymentSaving(false)
    }
  }

  const handleAddHoliday = async () => {
    if (!newHolidayDate) return
    setHolidaySaving(true)
    setHolidayError(null)
    try {
      const updated = await venueService.addHoliday(venueID, {
        date: newHolidayDate,
        isClosed: newHolidayIsClosed,
        ...(!newHolidayIsClosed && { openTime: newHolidayOpen, closeTime: newHolidayClose }),
      })
      setHolidays(updated.holidays)
      setNewHolidayDate('')
      setNewHolidayIsClosed(true)
    } catch (e) {
      setHolidayError('Failed to add holiday')
      console.error(e)
    } finally {
      setHolidaySaving(false)
    }
  }

  const handleRemoveHoliday = async (date: string) => {
    setHolidayError(null)
    try {
      const updated = await venueService.removeHoliday(venueID, date)
      setHolidays(updated.holidays)
    } catch (e) {
      setHolidayError('Failed to remove holiday')
      console.error(e)
    }
  }

  const updateDay = (index: number, partial: Partial<DayScheduleState>) => {
    setWeekDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...partial } : d)))
  }

  if (initLoading) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ pt: 2, pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => router.push('/admin')} sx={{ mr: 1 }}>
            All Venues
          </Button>
        </Box>

        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {venue?.name.en || venue?.name.th}
        </Typography>

        {/* Navigation tabs */}
        <Tabs
          value="settings"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          onChange={(_, v) => {
            if (v === 'dashboard') router.push(`/venues/${venueID}/admin/dashboard`)
            if (v === 'timetable') router.push(`/venues/${venueID}/admin/timetable`)
            if (v === 'bookings') router.push(`/venues/${venueID}/admin/bookings`)
          }}
        >
          <Tab label="Dashboard" value="dashboard" />
          <Tab label="Timetable" value="timetable" />
          <Tab label="Payments" value="bookings" />
          <Tab label="Settings" value="settings" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {/* ── General Info ─────────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>General Info</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              size="small"
              label="Name (English)"
              value={nameEN}
              onChange={(e) => setNameEN(e.target.value)}
              sx={{ flex: 1, minWidth: 180 }}
            />
            <TextField
              size="small"
              label="Name (Thai)"
              value={nameTH}
              onChange={(e) => setNameTH(e.target.value)}
              sx={{ flex: 1, minWidth: 180 }}
            />
          </Box>
          <TextField
            size="small"
            label="Address"
            fullWidth
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" size="small" onClick={handleSaveGeneral} disabled={generalSaving}>
              {generalSaving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
            {generalSuccess && <Typography variant="body2" color="success.main">Saved!</Typography>}
          </Box>
        </Paper>

        {/* ── Photos & Branding ─────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>Photos &amp; Branding</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload a cover photo and logo for your venue.
          </Typography>

          {/* Cover image */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Cover Photo</Typography>
          {coverImage && (
            <Box
              component="img"
              src={coverImage}
              alt="Cover"
              sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1, mb: 1.5, border: '1px solid', borderColor: 'divider', display: 'block' }}
            />
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              size="small"
              component="label"
              disabled={coverUploading}
            >
              {coverUploading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              {coverImage ? 'Replace Cover Photo' : 'Upload Cover Photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadCover(file)
                  e.target.value = ''
                }}
              />
            </Button>
            {coverSuccess && <Typography variant="body2" color="success.main">Uploaded!</Typography>}
          </Box>

          <Divider sx={{ my: 2.5 }} />

          {/* Logo */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Logo</Typography>
          {logo && (
            <Box sx={{ mb: 1.5 }}>
              <Box
                component="img"
                src={logo}
                alt="Logo"
                sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '50%', border: '1px solid', borderColor: 'divider' }}
              />
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              size="small"
              component="label"
              disabled={logoUploading}
            >
              {logoUploading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              {logo ? 'Replace Logo' : 'Upload Logo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadLogo(file)
                  e.target.value = ''
                }}
              />
            </Button>
            {logoSuccess && <Typography variant="body2" color="success.main">Uploaded!</Typography>}
          </Box>
        </Paper>

        {/* ── Operating Hours & Slot Duration ──────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Operating Hours</Typography>

          {weekDays.map((day, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
              <FormControlLabel
                sx={{ width: 130, m: 0 }}
                control={
                  <Switch
                    checked={day.isOpen}
                    onChange={(e) => updateDay(i, { isOpen: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography variant="body2" sx={{ width: 80 }}>{DAYS[i]}</Typography>}
              />
              {day.isOpen ? (
                <>
                  <TextField
                    size="small"
                    label="Open"
                    type="time"
                    value={day.open}
                    onChange={(e) => updateDay(i, { open: e.target.value })}
                    sx={{ width: 130 }}
                    inputProps={{ step: 1800 }}
                  />
                  <TextField
                    size="small"
                    label="Close"
                    type="time"
                    value={day.close}
                    onChange={(e) => updateDay(i, { close: e.target.value })}
                    sx={{ width: 130 }}
                    inputProps={{ step: 1800 }}
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Closed</Typography>
              )}
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />

          <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
            <InputLabel>Slot Duration</InputLabel>
            <Select
              value={slotDuration}
              label="Slot Duration"
              onChange={(e) => setSlotDuration(Number(e.target.value) as 30 | 60)}
            >
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={60}>60 minutes</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" size="small" onClick={handleSaveSchedule} disabled={scheduleSaving}>
              {scheduleSaving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
            {scheduleSuccess && <Typography variant="body2" color="success.main">Saved!</Typography>}
          </Box>
        </Paper>

        {/* ── Gap Policy ───────────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Gap Policy</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Require a minimum gap between consecutive bookings so courts are not completely fragmented.
          </Typography>
          <FormControlLabel
            control={<Switch checked={gapEnabled} onChange={(e) => setGapEnabled(e.target.checked)} />}
            label="Enable gap policy"
            sx={{ mb: 2, display: 'block' }}
          />
          {gapEnabled && (
            <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
              <InputLabel>Minimum Gap</InputLabel>
              <Select
                value={gapMinutes}
                label="Minimum Gap"
                onChange={(e) => setGapMinutes(Number(e.target.value) as 30 | 60)}
              >
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={60}>60 minutes</MenuItem>
              </Select>
            </FormControl>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" size="small" onClick={handleSaveGapPolicy} disabled={gapSaving}>
              {gapSaving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
            {gapSuccess && <Typography variant="body2" color="success.main">Saved!</Typography>}
          </Box>
        </Paper>

        {/* ── Payment Info ─────────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Payment Info</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
            <TextField size="small" label="Account Name" value={accountName} onChange={(e) => setAccountName(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" label="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
            <TextField size="small" label="PromptPay ID" value={promptPayID} onChange={(e) => setPromptPayID(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" size="small" onClick={handleSavePayment} disabled={paymentSaving}>
              {paymentSaving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
            {paymentSuccess && <Typography variant="body2" color="success.main">Saved!</Typography>}
          </Box>
        </Paper>

        {/* ── Managers ─────────────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>Managers</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Managers can access this venue&apos;s admin panel.
          </Typography>

          {managerError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setManagerError(null)}>{managerError}</Alert>}

          {/* Current managers */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {managerUserIDs.length === 0 && (
              <Typography variant="body2" color="text.secondary">No managers added yet.</Typography>
            )}
            {managerUserIDs.map((uid) => {
              const player = allPlayers.find((p) => p.userID === uid)
              const label = player
                ? (player.displayName?.en || player.displayName?.th || player.officialName.en || player.officialName.th || player.officialName.pronunciation)
                : uid
              return (
                <Chip
                  key={uid}
                  label={label}
                  avatar={player?.photo ? <Box component="img" src={player.photo} sx={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} /> : undefined}
                  onDelete={() => handleRemoveManager(uid)}
                  deleteIcon={<DeleteIcon />}
                  variant="outlined"
                  size="small"
                />
              )
            })}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Add manager */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Add Manager</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Autocomplete
              options={allPlayers.filter((p) => !managerUserIDs.includes(p.userID))}
              value={selectedPlayer}
              onChange={(_, val) => setSelectedPlayer(val)}
              filterOptions={(options, { inputValue }) =>
                inputValue.length < 3 ? [] : options.filter((p) => {
                  const q = inputValue.toLowerCase()
                  return (
                    p.officialName.en?.toLowerCase().includes(q) ||
                    p.officialName.th?.toLowerCase().includes(q) ||
                    p.officialName.pronunciation?.toLowerCase().includes(q) ||
                    p.displayName?.en?.toLowerCase().includes(q) ||
                    p.displayName?.th?.toLowerCase().includes(q)
                  )
                })
              }
              noOptionsText={allPlayers.length === 0 ? 'Loading...' : 'Type at least 3 characters'}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Search player" sx={{ minWidth: 260 }} />
              )}
              renderOption={({ key, ...props }, p) => {
                const displayName = p.displayName?.en || p.displayName?.th
                const officialName = p.officialName.en || p.officialName.th || p.officialName.pronunciation
                return (
                  <Box component="li" key={p.userID} {...props} sx={{ flexDirection: 'column', alignItems: 'flex-start !important' }}>
                    <Typography variant="body2" fontWeight={600}>{displayName || officialName}</Typography>
                    {displayName && (
                      <Typography variant="caption" color="text.secondary">{officialName}</Typography>
                    )}
                  </Box>
                )
              }}
              getOptionLabel={(p) =>
                p.displayName?.en || p.displayName?.th || p.officialName.en || p.officialName.th || p.officialName.pronunciation
              }
              isOptionEqualToValue={(a, b) => a.userID === b.userID}
              size="small"
              sx={{ minWidth: 260 }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={managerAdding ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}
              onClick={handleAddManager}
              disabled={!selectedPlayer || managerAdding}
            >
              Add
            </Button>
          </Box>
        </Paper>

        {/* ── Holidays ─────────────────────────────────────────────────── */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Holidays & Special Dates</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mark a date as closed or set custom hours.
          </Typography>

          {holidayError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setHolidayError(null)}>{holidayError}</Alert>}

          {/* Existing holidays */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {holidays.length === 0 && (
              <Typography variant="body2" color="text.secondary">No special dates configured.</Typography>
            )}
            {[...holidays]
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((h) => (
                <Chip
                  key={h.date}
                  label={`${moment(h.date).format('DD MMM YYYY')} — ${h.isClosed ? 'Closed' : `${h.openTime}–${h.closeTime}`}`}
                  onDelete={() => handleRemoveHoliday(moment(h.date).format('YYYY-MM-DD'))}
                  deleteIcon={<DeleteIcon />}
                  variant="outlined"
                  size="small"
                />
              ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Add new holiday */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Add Date</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              label="Date"
              type="date"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newHolidayIsClosed}
                  onChange={(e) => setNewHolidayIsClosed(e.target.checked)}
                  size="small"
                />
              }
              label="Closed all day"
            />
            {!newHolidayIsClosed && (
              <>
                <TextField
                  size="small"
                  label="Open"
                  type="time"
                  value={newHolidayOpen}
                  onChange={(e) => setNewHolidayOpen(e.target.value)}
                  sx={{ width: 130 }}
                  inputProps={{ step: 1800 }}
                />
                <TextField
                  size="small"
                  label="Close"
                  type="time"
                  value={newHolidayClose}
                  onChange={(e) => setNewHolidayClose(e.target.value)}
                  sx={{ width: 130 }}
                  inputProps={{ step: 1800 }}
                />
              </>
            )}
            <IconButton
              color="primary"
              onClick={handleAddHoliday}
              disabled={!newHolidayDate || holidaySaving}
              size="small"
            >
              {holidaySaving ? <CircularProgress size={18} /> : <AddIcon />}
            </IconButton>
          </Box>
        </Paper>
      </Container>
    </Layout>
  )
}
