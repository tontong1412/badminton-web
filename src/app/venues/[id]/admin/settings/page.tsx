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
  InputAdornment,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { Autocomplete } from '@mui/material'
import { HolidaySchedule, PlayerWithAccount, User, Venue, Court, CourtPricingRule, Coupon } from '@/type'
import venueService from '../../../../services/venues'
import { useVenue } from '../../../../libs/data'
import playerService from '../../../../services/players'
import courtService from '../../../../services/courts'
import couponService, { CreateCouponPayload } from '../../../../services/coupons'
import moment from 'moment'
import { useParams, useRouter } from 'next/navigation'
import Layout from '../../../../components/Layout/index'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../libs/redux/store'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const FACILITY_OPTIONS = [
  'Parking', 'Shower', 'Locker', 'Cafe / Snack Bar', 'Air Conditioning',
  'Equipment Rental', 'CCTV', 'WiFi', 'Spectator Area', 'Wheelchair Accessible',
]

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

  const [venue, setVenueState] = useState<Venue | null>(null)
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

  // SlipOK state
  const [slipokBranchId, setSlipokBranchId] = useState('')
  const [slipokApiKey, setSlipokApiKey] = useState('')
  const [slipokHasApiKey, setSlipokHasApiKey] = useState(false)
  const [slipokEnabled, setSlipokEnabled] = useState(false)
  const [slipokSaving, setSlipokSaving] = useState(false)
  const [slipokSuccess, setSlipokSuccess] = useState(false)
  const [slipokError, setSlipokError] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [slipokToggling, setSlipokToggling] = useState(false)

  // Holidays state
  const [holidays, setHolidays] = useState<HolidaySchedule[]>([])
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayIsClosed, setNewHolidayIsClosed] = useState(true)

  // Facilities state
  const [facilities, setFacilities] = useState<string[]>([])
  const [facilitiesSaving, setFacilitiesSaving] = useState(false)
  const [facilitiesSuccess, setFacilitiesSuccess] = useState(false)

  // Courts state
  const [courts, setCourts] = useState<Court[]>([])
  const [courtsLoading, setCourtsLoading] = useState(false)
  const [courtError, setCourtError] = useState<string | null>(null)
  const [courtSuccess, setCourtSuccess] = useState<string | null>(null)
  // Form for add/edit
  const [editingCourt, setEditingCourt] = useState<Court | null>(null) // null = add mode
  const [courtFormOpen, setCourtFormOpen] = useState(false)
  const [courtName, setCourtName] = useState('')
  const [courtDesc, setCourtDesc] = useState('')
  const [courtPrice, setCourtPrice] = useState('')
  const [courtCurrency, setCourtCurrency] = useState('THB')
  const [courtStatus, setCourtStatus] = useState<'active' | 'inactive'>('active')
  const [courtPricingRules, setCourtPricingRules] = useState<CourtPricingRule[]>([])
  const [courtType, setCourtType] = useState('regular')
  const [courtSaving, setCourtSaving] = useState(false)
  const [newHolidayOpen, setNewHolidayOpen] = useState('08:00')
  const [newHolidayClose, setNewHolidayClose] = useState('22:00')
  const [holidaySaving, setHolidaySaving] = useState(false)
  const [holidayError, setHolidayError] = useState<string | null>(null)

  // Coupon state
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage')
  const [newCouponValue, setNewCouponValue] = useState('')
  const [newCouponMaxAmount, setNewCouponMaxAmount] = useState('')
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('')
  const [newCouponExpiry, setNewCouponExpiry] = useState('')
  const [couponSaving, setCouponSaving] = useState(false)

  const { venue: swrVenue, isLoading: swrLoading } = useVenue(venueID)

  useEffect(() => {
    if (!swrVenue) return
    const v = swrVenue
    const isSystemAdmin = (user as { role?: string })?.role === 'admin'
    const userID = (user as unknown as { id: string } | null)?.id
    const isOwner = v.ownerUserID === userID
    const isManager = v.managerUserIDs.includes(userID ?? '')
    if (!userReady) return
    if (!userID || (!isSystemAdmin && !isOwner && !isManager)) {
      router.replace('/admin')
      return
    }
    setVenueState(v)
    setNameTH(v.name.th)
    setNameEN(v.name.en)
    setAddress(v.address)
    setCoverImage(v.coverImage ?? '')
    setLogo(v.logo ?? '')
    setManagerUserIDs(v.managerUserIDs ?? '')
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
    setSlipokBranchId(v.slipok?.branchId ?? '')
    setSlipokHasApiKey(v.slipok?.hasApiKey ?? false)
    setSlipokEnabled(v.slipok?.enabled ?? false)
    setHolidays(v.holidays ?? [])
    setFacilities(v.facilities ?? [])
    setInitLoading(false)
  // Only run when SWR data first arrives; userReady/user/router guard on changes
  }, [swrVenue, userReady])

  // Load courts for this venue
  useEffect(() => {
    if (!venueID) return
    setCourtsLoading(true)
    courtService.getAll()
      .then((all) => setCourts(all.filter((c) => c.venueID === venueID)))
      .catch(() => setCourts([]))
      .finally(() => setCourtsLoading(false))
  }, [venueID])

  // Load coupons for this venue
  useEffect(() => {
    if (!venueID) return
    setCouponsLoading(true)
    couponService.listByVenue(venueID)
      .then(setCoupons)
      .catch(() => setCoupons([]))
      .finally(() => setCouponsLoading(false))
  }, [venueID])

  useEffect(() => {
    if (swrLoading && !swrVenue) setInitLoading(true)
  }, [swrLoading, swrVenue])

  // Load players with accounts for manager search
  useEffect(() => {
    playerService.getWithAccount().then(setAllPlayers).catch(() => {/* non-critical */})
  }, [])

  const handleCreateCoupon = async() => {
    const value = parseFloat(newCouponValue)
    if (!newCouponCode.trim() || isNaN(value) || value <= 0) {
      setCouponError('Code and a valid discount value are required.')
      return
    }
    if (newCouponType === 'percentage' && value > 100) {
      setCouponError('Percentage discount cannot exceed 100.')
      return
    }
    setCouponSaving(true)
    setCouponError(null)
    try {
      const payload: CreateCouponPayload = {
        code: newCouponCode.trim().toUpperCase(),
        discountType: newCouponType,
        discountValue: value,
        ...(newCouponType === 'percentage' && newCouponMaxAmount ? { maxDiscountAmount: parseFloat(newCouponMaxAmount) } : {}),
        ...(newCouponMaxUses ? { maxUses: parseInt(newCouponMaxUses) } : {}),
        ...(newCouponExpiry ? { expiresAt: newCouponExpiry } : {}),
      }
      const created = await couponService.create(venueID, payload)
      setCoupons((prev) => [created, ...prev])
      setNewCouponCode('')
      setNewCouponValue('')
      setNewCouponMaxAmount('')
      setNewCouponMaxUses('')
      setNewCouponExpiry('')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCouponError(msg ?? 'Failed to create coupon.')
    } finally {
      setCouponSaving(false)
    }
  }

  const handleDeleteCoupon = async(couponID: string) => {
    try {
      await couponService.remove(venueID, couponID)
      setCoupons((prev) => prev.filter((c) => c.id !== couponID))
    } catch {
      setCouponError('Failed to delete coupon.')
    }
  }

  const handleAddManager = async() => {
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

  const handleRemoveManager = async(userID: string) => {
    setManagerError(null)
    try {
      const updated = await venueService.removeManager(venueID, userID)
      setManagerUserIDs(updated.managerUserIDs)
    } catch (e) {
      setManagerError('Failed to remove manager')
      console.error(e)
    }
  }

  const handleSaveGeneral = async() => {
    setGeneralSaving(true)
    setGeneralSuccess(false)
    setError(null)
    try {
      const updated = await venueService.update(venueID, {
        name: { th: nameTH, en: nameEN },
        address,
      })
      setVenueState(updated)
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

  const handleUploadCover = async(file: File) => {
    setCoverUploading(true)
    setCoverSuccess(false)
    setError(null)
    try {
      const base64 = await readFileAsBase64(file)
      const updated = await venueService.uploadImage(venueID, 'coverImage', base64)
      setVenueState(updated)
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

  const handleUploadLogo = async(file: File) => {
    setLogoUploading(true)
    setLogoSuccess(false)
    setError(null)
    try {
      const base64 = await readFileAsBase64(file)
      const updated = await venueService.uploadImage(venueID, 'logo', base64)
      setVenueState(updated)
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

  const handleSaveSchedule = async() => {
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

  const handleSaveGapPolicy = async() => {
    setGapSaving(true)
    setGapSuccess(false)
    setError(null)
    try {
      const updated = await venueService.setSchedule(venueID, {
        gapPolicy: { enabled: gapEnabled, minimumGapMinutes: gapMinutes },
      })
      setVenueState(updated)
      setGapSuccess(true)
      setTimeout(() => setGapSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save gap policy')
      console.error(e)
    } finally {
      setGapSaving(false)
    }
  }

  const handleSavePayment = async() => {
    setPaymentSaving(true)
    setPaymentSuccess(false)
    setError(null)
    try {
      const updated = await venueService.update(venueID, {
        payment: { bankName, accountNumber, accountName, promptPayID },
      } as Partial<Venue>)
      setVenueState(updated)
      setPaymentSuccess(true)
      setTimeout(() => setPaymentSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save payment info')
      console.error(e)
    } finally {
      setPaymentSaving(false)
    }
  }

  const handleAddHoliday = async() => {
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

  const handleRemoveHoliday = async(date: string) => {
    setHolidayError(null)
    try {
      const updated = await venueService.removeHoliday(venueID, date)
      setHolidays(updated.holidays)
    } catch (e) {
      setHolidayError('Failed to remove holiday')
      console.error(e)
    }
  }

  const handleSaveSlipok = async() => {
    setSlipokSaving(true)
    setSlipokSuccess(false)
    setSlipokError(null)
    try {
      const slipokPayload: { branchId?: string; apiKey?: string } = {}
      if (slipokBranchId) slipokPayload.branchId = slipokBranchId
      if (slipokApiKey) slipokPayload.apiKey = slipokApiKey
      const updated = await venueService.update(venueID, { slipok: slipokPayload } as Partial<Venue>)
      setVenueState(updated)
      setSlipokHasApiKey(updated.slipok?.hasApiKey ?? false)
      setSlipokEnabled(updated.slipok?.enabled ?? false)
      setSlipokApiKey('')
      setSlipokSuccess(true)
      setTimeout(() => setSlipokSuccess(false), 3000)
    } catch (e) {
      setSlipokError('Failed to save SlipOK settings')
      console.error(e)
    } finally {
      setSlipokSaving(false)
    }
  }

  const handleToggleSlipok = async(enabled: boolean) => {
    setSlipokToggling(true)
    setSlipokError(null)
    try {
      const updated = await venueService.update(venueID, { slipok: { enabled } } as Partial<Venue>)
      setVenueState(updated)
      setSlipokEnabled(updated.slipok?.enabled ?? enabled)
    } catch (e) {
      setSlipokError('Failed to update SlipOK status')
      console.error(e)
    } finally {
      setSlipokToggling(false)
    }
  }

  const handleSaveFacilities = async() => {
    setFacilitiesSaving(true)
    setFacilitiesSuccess(false)
    try {
      const updated = await venueService.setFacilities(venueID, facilities)
      setVenueState(updated)
      setFacilities(updated.facilities ?? [])
      setFacilitiesSuccess(true)
      setTimeout(() => setFacilitiesSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save facilities')
      console.error(e)
    } finally {
      setFacilitiesSaving(false)
    }
  }

  const openCourtForm = (court?: Court) => {
    if (court) {
      setEditingCourt(court)
      setCourtName(court.name)
      setCourtDesc(court.description ?? '')
      setCourtPrice(String(court.pricePerHour))
      setCourtCurrency(court.currency)
      setCourtStatus(court.status)
      setCourtPricingRules(court.pricingRules ?? [])
      setCourtType(court.courtType ?? 'regular')
    } else {
      setEditingCourt(null)
      setCourtName('')
      setCourtDesc('')
      setCourtPrice('')
      setCourtCurrency('THB')
      setCourtStatus('active')
      setCourtPricingRules([])
      setCourtType('regular')
    }
    setCourtError(null)
    setCourtSuccess(null)
    setCourtFormOpen(true)
  }

  const handleSaveCourt = async() => {
    if (!courtName.trim() || !courtPrice) {
      setCourtError('Name and price are required.')
      return
    }
    const price = parseFloat(courtPrice)
    if (isNaN(price) || price < 0) {
      setCourtError('Price must be a valid number.')
      return
    }
    setCourtSaving(true)
    setCourtError(null)
    try {
      if (editingCourt) {
        const updated = await courtService.update(editingCourt.id, {
          name: courtName.trim(),
          description: courtDesc.trim() || undefined,
          pricePerHour: price,
          currency: courtCurrency,
          status: courtStatus,
          pricingRules: courtPricingRules,
          courtType: courtType.trim() || 'regular',
        })
        setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      } else {
        const created = await courtService.create({
          venueID,
          name: courtName.trim(),
          description: courtDesc.trim() || undefined,
          pricePerHour: price,
          currency: courtCurrency,
          status: courtStatus,
          courtType: courtType.trim() || 'regular',
        })
        setCourts((prev) => [...prev, created])
      }
      setCourtSuccess(editingCourt ? 'Court updated.' : 'Court created.')
      setCourtFormOpen(false)
    } catch (e) {
      setCourtError('Failed to save court.')
      console.error(e)
    } finally {
      setCourtSaving(false)
    }
  }

  const addPricingRule = () =>
    setCourtPricingRules((prev) => [...prev, { startTime: '09:00', endTime: '17:00', pricePerHour: 0 }])

  const updatePricingRule = (i: number, field: keyof CourtPricingRule, value: string | number) =>
    setCourtPricingRules((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  const removePricingRule = (i: number) =>
    setCourtPricingRules((prev) => prev.filter((_, idx) => idx !== i))

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
            <Box key={i} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5, alignItems: 'center' }}>
              {/* Toggle + day name — allowed to wrap to its own row */}
              <FormControlLabel
                sx={{ m: 0, minWidth: 140, flexShrink: 0 }}
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
                /* Time pickers always on the same row as each other */
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
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
                </Box>
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

        {/* ── SlipOK Integration ───────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>SlipOK Integration</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure SlipOK credentials to enable automatic slip verification for this venue.
          </Typography>

          {slipokError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSlipokError(null)}>{slipokError}</Alert>}

          {user?.role === 'admin' && (
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={slipokEnabled}
                    onChange={(e) => handleToggleSlipok(e.target.checked)}
                    color="primary"
                    disabled={slipokToggling}
                  />
                }
                label={slipokToggling ? (slipokEnabled ? 'Disabling…' : 'Enabling…') : 'Enable SlipOK verification'}
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Only system admins can enable or disable SlipOK verification.
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              size="small"
              label="Branch ID"
              value={slipokBranchId}
              onChange={(e) => setSlipokBranchId(e.target.value)}
              sx={{ flex: 1, minWidth: 180 }}
            />
            <TextField
              size="small"
              label="API Key"
              type={showApiKey ? 'text' : 'password'}
              value={slipokApiKey}
              onChange={(e) => setSlipokApiKey(e.target.value)}
              placeholder={slipokHasApiKey ? '••••••••  (leave blank to keep existing)' : 'Enter API key'}
              sx={{ flex: 1, minWidth: 220 }}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              InputProps={{
                endAdornment: slipokApiKey ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowApiKey((v) => !v)} edge="end" tabIndex={-1}>
                      {showApiKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>
          {slipokHasApiKey && !slipokApiKey && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              An API key is already saved. Enter a new one to replace it.
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" size="small" onClick={handleSaveSlipok} disabled={slipokSaving}>
              {slipokSaving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
            {slipokSuccess && <Typography variant="body2" color="success.main">Saved!</Typography>}
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
              renderOption={(props, p) => {
                const displayName = p.displayName?.en || p.displayName?.th
                const officialName = p.officialName.en || p.officialName.th || p.officialName.pronunciation
                return (
                  <Box component="li" {...props} key={p.userID} sx={{ flexDirection: 'column', alignItems: 'flex-start !important' }}>
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

        {/* ── Facilities ─────────────────────────────────────── */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Facilities</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {FACILITY_OPTIONS.map((f) => {
              const selected = facilities.includes(f)
              return (
                <Chip
                  key={f}
                  label={f}
                  onClick={() => setFacilities((prev) => selected ? prev.filter((x) => x !== f) : [...prev, f])}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  sx={selected ? { bgcolor: '#80644f', '&:hover': { bgcolor: '#695241' } } : {}}
                />
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button variant="contained" size="small" onClick={handleSaveFacilities} disabled={facilitiesSaving} sx={{ bgcolor: '#80644f', '&:hover': { bgcolor: '#695241' } }}>
              {facilitiesSaving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
            {facilitiesSuccess && <Typography variant="body2" color="success.main">Saved!</Typography>}
          </Box>
        </Paper>
        {/* ── Courts ─────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Courts</Typography>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => openCourtForm()} sx={{ bgcolor: '#80644f', '&:hover': { bgcolor: '#695241' } }}>
              Add Court
            </Button>
          </Box>

          {courtSuccess && <Alert severity="success" sx={{ mb: 2 }}>{courtSuccess}</Alert>}

          {courtsLoading ? (
            <CircularProgress size={24} />
          ) : courts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No courts yet. Add one above.</Typography>
          ) : (
            courts.map((court) => (
              <Box key={court.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography fontWeight={600}>{court.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {court.pricePerHour} {court.currency}/hr · {court.status}
                    {court.courtType && ` · ${court.courtType}`}
                    {court.pricingRules && court.pricingRules.length > 0 && ` · ${court.pricingRules.length} pricing rule(s)`}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => openCourtForm(court)}>Edit</Button>
              </Box>
            ))
          )}

          {/* Court form dialog */}
          {courtFormOpen && (
            <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {editingCourt ? `Edit: ${editingCourt.name}` : 'New Court'}
              </Typography>
              {courtError && <Alert severity="error" sx={{ mb: 2 }}>{courtError}</Alert>}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <TextField label="Name" value={courtName} onChange={(e) => setCourtName(e.target.value)} size="small" required sx={{ flex: '1 1 180px' }} />
                <TextField label="Description" value={courtDesc} onChange={(e) => setCourtDesc(e.target.value)} size="small" sx={{ flex: '2 1 260px' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <TextField label="Base Price / hr" value={courtPrice} onChange={(e) => setCourtPrice(e.target.value)} size="small" type="number" required sx={{ flex: '1 1 140px' }} />
                <TextField label="Currency" value={courtCurrency} onChange={(e) => setCourtCurrency(e.target.value)} size="small" sx={{ flex: '1 1 100px' }} />
                <FormControl size="small" sx={{ flex: '1 1 140px' }}>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={courtStatus} onChange={(e) => setCourtStatus(e.target.value as 'active' | 'inactive')}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
                <Autocomplete
                  freeSolo
                  size="small"
                  sx={{ flex: '1 1 140px' }}
                  options={['regular', ...new Set(courts.filter((c) => c.courtType && c.courtType !== 'regular').map((c) => c.courtType!))]}
                  value={courtType}
                  onInputChange={(_e, val) => setCourtType(val)}
                  renderInput={(params) => <TextField {...params} label="Type" />}
                />
              </Box>

              {/* Pricing rules */}
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Time-based Pricing Rules (optional)</Typography>
              {courtPricingRules.map((rule, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField label="Start" type="time" value={rule.startTime} onChange={(e) => updatePricingRule(i, 'startTime', e.target.value)} size="small" sx={{ width: 120 }} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField label="End" type="time" value={rule.endTime} onChange={(e) => updatePricingRule(i, 'endTime', e.target.value)} size="small" sx={{ width: 120 }} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField label="Price/hr" type="number" value={rule.pricePerHour} onChange={(e) => updatePricingRule(i, 'pricePerHour', parseFloat(e.target.value))} size="small" sx={{ width: 110 }} />
                  <IconButton size="small" onClick={() => removePricingRule(i)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addPricingRule} sx={{ mb: 2 }}>Add Rule</Button>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" onClick={() => setCourtFormOpen(false)} disabled={courtSaving}>Cancel</Button>
                <Button variant="contained" size="small" onClick={handleSaveCourt} disabled={courtSaving} sx={{ bgcolor: '#80644f', '&:hover': { bgcolor: '#695241' } }}>
                  {courtSaving ? <CircularProgress size={16} /> : 'Save'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {/* ── Coupon Codes ─────────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>Discount Coupons</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create coupon codes that customers can apply when booking courts at this venue.
          </Typography>

          {couponError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCouponError(null)}>{couponError}</Alert>}

          {/* Existing coupons */}
          {couponsLoading ? (
            <CircularProgress size={24} sx={{ mb: 2 }} />
          ) : coupons.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No coupons yet.</Typography>
          ) : (
            <Box sx={{ mb: 3 }}>
              {coupons.map((coupon) => (
                <Box key={coupon.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={coupon.code} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                      <Chip
                        label={coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}% off${coupon.maxDiscountAmount ? ` (max ${coupon.maxDiscountAmount})` : ''}`
                          : `${coupon.discountValue} THB off`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                      {!coupon.isActive && <Chip label="Inactive" size="small" color="default" />}
                      {coupon.expiresAt && moment(coupon.expiresAt).isBefore(moment()) && (
                        <Chip label="Expired" size="small" color="error" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Used {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''} time{coupon.usedCount !== 1 ? 's' : ''}
                      {coupon.expiresAt ? ` · Expires ${moment(coupon.expiresAt).format('D MMM YYYY')}` : ''}
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleDeleteCoupon(coupon.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* Create new coupon */}
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Create New Coupon</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
            <TextField
              size="small"
              label="Code"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME20"
              inputProps={{ style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
              sx={{ flex: '1 1 160px' }}
            />
            <FormControl size="small" sx={{ flex: '0 0 140px' }}>
              <InputLabel>Type</InputLabel>
              <Select value={newCouponType} label="Type" onChange={(e) => setNewCouponType(e.target.value as 'percentage' | 'fixed')}>
                <MenuItem value="percentage">Percentage (%)</MenuItem>
                <MenuItem value="fixed">Fixed amount</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label={newCouponType === 'percentage' ? 'Discount %' : 'Discount amount'}
              value={newCouponValue}
              onChange={(e) => setNewCouponValue(e.target.value)}
              type="number"
              inputProps={{ min: 1, max: newCouponType === 'percentage' ? 100 : undefined }}
              sx={{ flex: '0 0 130px' }}
            />
            {newCouponType === 'percentage' && (
              <TextField
                size="small"
                label="Max discount amount (optional)"
                value={newCouponMaxAmount}
                onChange={(e) => setNewCouponMaxAmount(e.target.value)}
                type="number"
                inputProps={{ min: 1 }}
                helperText="Cap the discount at this amount"
                sx={{ flex: '0 0 200px' }}
              />
            )}
            <TextField
              size="small"
              label="Max uses (optional)"
              value={newCouponMaxUses}
              onChange={(e) => setNewCouponMaxUses(e.target.value)}
              type="number"
              inputProps={{ min: 1 }}
              sx={{ flex: '0 0 150px' }}
            />
            <TextField
              size="small"
              label="Expiry date (optional)"
              value={newCouponExpiry}
              onChange={(e) => setNewCouponExpiry(e.target.value)}
              type="date"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: moment().add(1, 'day').format('YYYY-MM-DD') }}
              sx={{ flex: '0 0 170px' }}
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={couponSaving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
            onClick={handleCreateCoupon}
            disabled={couponSaving || !newCouponCode.trim() || !newCouponValue}
          >
            {couponSaving ? 'Creating…' : 'Create Coupon'}
          </Button>
        </Paper>

      </Container>
    </Layout>
  )
}
