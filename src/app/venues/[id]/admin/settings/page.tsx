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
import { HolidaySchedule, User, Venue } from '@/type'
import venueService from '../../../../services/venues'
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

  const [venue, setVenue] = useState<Venue | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // General info state
  const [nameTH, setNameTH] = useState('')
  const [nameEN, setNameEN] = useState('')
  const [address, setAddress] = useState('')
  const [generalSaving, setGeneralSaving] = useState(false)
  const [generalSuccess, setGeneralSuccess] = useState(false)

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
        if (!userID || (!isOwner && !isManager)) {
          router.replace('/admin')
          return
        }

        setVenue(v)
        setNameTH(v.name.th)
        setNameEN(v.name.en)
        setAddress(v.address)

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
  }, [venueID, user, router])

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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => router.push('/admin')} sx={{ mr: 1 }}>
            All Venues
          </Button>
        </Box>

        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
          {venue?.name.en || venue?.name.th}
        </Typography>

        {/* Navigation tabs */}
        <Tabs
          value="settings"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          onChange={(_, v) => {
            if (v === 'timetable') router.push(`/venues/${venueID}/admin/timetable`)
            if (v === 'bookings') router.push(`/venues/${venueID}/admin/bookings`)
          }}
        >
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
