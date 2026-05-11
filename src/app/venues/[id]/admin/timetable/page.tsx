'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  ToggleButton,
  IconButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import { Booking, BookingStatus, Court, PaymentStatus, User, Venue } from '@/type'
import bookingsService, { BookingBundleItem } from '../../../../services/bookings'
import venueService from '../../../../services/venues'
import moment from 'moment'
import { useParams, useRouter } from 'next/navigation'
import Layout from '../../../../components/Layout/index'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../libs/redux/store'

// Generate half-hour slots from 06:00 to 23:00
const ALL_SLOTS: string[] = []
for (let h = 6; h < 23; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
ALL_SLOTS.push('23:00')

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`
}

function getStatusColor(status: BookingStatus, paymentStatus: PaymentStatus): string {
  if (status === BookingStatus.Cancelled) return '#e0e0e0'
  if (paymentStatus === PaymentStatus.Paid) return '#c8e6c9'
  if (paymentStatus === PaymentStatus.Pending) return '#fff9c4'
  return '#bbdefb'
}

function getStatusLabel(paymentStatus: PaymentStatus): string {
  if (paymentStatus === PaymentStatus.Paid) return 'Paid'
  if (paymentStatus === PaymentStatus.Pending) return 'Slip Uploaded'
  return 'Unpaid'
}

function getMaxAvailableMinutes(courtID: string, startTime: string, bookings: Booking[]): number {
  const startMin = timeToMinutes(startTime)
  let maxMin = timeToMinutes('23:00') - startMin
  for (const b of bookings) {
    if (b.courtID !== courtID || b.status === BookingStatus.Cancelled) continue
    const bStart = timeToMinutes(b.startTime)
    if (bStart >= startMin && bStart < startMin + maxMin) {
      maxMin = bStart - startMin
    }
  }
  return maxMin
}

function getDurationOptions(startTime: string, maxAvailableMinutes: number): { value: number; label: string }[] {
  const startMin = timeToMinutes(startTime)
  const maxDuration = Math.min(maxAvailableMinutes, timeToMinutes('23:00') - startMin)
  const opts: { value: number; label: string }[] = []
  for (let d = 30; d <= maxDuration; d += 30) {
    const hours = d / 60
    const label = d === 30 ? '30 min' : Number.isInteger(hours) ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours} hours`
    opts.push({ value: d, label })
  }
  return opts
}

// Merge selected cells (courtID:slot) into bundle items grouped by court
function buildBundleItems(selectedCells: Set<string>, date: string): BookingBundleItem[] {
  const byCourtID = new Map<string, number[]>()
  for (const key of selectedCells) {
    const colonIdx = key.indexOf(':')
    const courtID = key.slice(0, colonIdx)
    const slot = key.slice(colonIdx + 1)
    const mins = timeToMinutes(slot)
    const list = byCourtID.get(courtID) ?? []
    list.push(mins)
    byCourtID.set(courtID, list)
  }

  const items: BookingBundleItem[] = []
  for (const [courtID, minsList] of byCourtID.entries()) {
    minsList.sort((a, b) => a - b)
    let rangeStart = minsList[0]
    let rangeEnd = minsList[0] + 30
    for (let i = 1; i < minsList.length; i++) {
      if (minsList[i] === rangeEnd) {
        rangeEnd += 30
      } else {
        items.push({ courtID, date, startTime: minutesToTime(rangeStart), endTime: minutesToTime(rangeEnd) })
        rangeStart = minsList[i]
        rangeEnd = minsList[i] + 30
      }
    }
    items.push({ courtID, date, startTime: minutesToTime(rangeStart), endTime: minutesToTime(rangeEnd) })
  }
  return items
}

interface BookingCell {
  booking: Booking;
  slotStart: string;
  rowSpan: number;
}

export default function VenueTimetablePage() {
  const params = useParams()
  const router = useRouter()
  const venueID = params.id as string
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null

  const [venue, setVenue] = useState<Venue | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [date, setDate] = useState<string>(moment().format('YYYY-MM-DD'))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Single-cell booking state
  const [bookDialog, setBookDialog] = useState<{ court: Court; startTime: string } | null>(null)
  const [bookDurationMinutes, setBookDurationMinutes] = useState(60)
  const [bookError, setBookError] = useState<string | null>(null)
  const [bookSubmitting, setBookSubmitting] = useState(false)

  // Multi-select booking state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [multiBookDialog, setMultiBookDialog] = useState(false)

  // Drag selection state
  const dragAnchor = useRef<{ courtID: string; slot: string } | null>(null)
  const [dragPreview, setDragPreview] = useState<Set<string>>(new Set())

  // Shared guest info
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  // Detail / cancel state
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    const init = async() => {
      try {
        const [v, allCourts] = await Promise.all([
          venueService.getById(venueID),
          venueService.getCourts(),
        ])
        const userID = (user as unknown as { id: string } | null)?.id
        const isOwner = v.ownerUserID === userID
        const isManager = v.managerUserIDs.includes(userID ?? '')
        if (!userID || (!isOwner && !isManager)) {
          router.replace('/admin')
          return
        }
        setVenue(v)
        setCourts(allCourts.filter((c) => c.venueID === venueID && c.status === 'active'))
      } catch (e) {
        setError('Failed to load venue')
        console.error(e)
      } finally {
        setInitLoading(false)
      }
    }
    init()
  }, [venueID, user, router])

  const refreshBookings = useCallback(async() => {
    if (!date) return
    try {
      setLoading(true)
      setError(null)
      const data = await bookingsService.getVenueBookings({ date, venueID })
      setBookings(data)
    } catch (e) {
      setError('Failed to load bookings')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [date, venueID])

  useEffect(() => { refreshBookings() }, [refreshBookings])
  useEffect(() => { setSelectedCells(new Set()) }, [date, selectMode])

  const sortedCourts = useMemo(() => [...courts].sort((a, b) => a.name.localeCompare(b.name)), [courts])

  const cellMap = useMemo(() => {
    const map = new Map<string, Map<string, BookingCell>>()
    sortedCourts.forEach((c) => map.set(c.id, new Map()))
    bookings.forEach((booking) => {
      if (booking.status === BookingStatus.Cancelled) return
      const courtSlots = map.get(booking.courtID)
      if (!courtSlots) return
      const startMin = timeToMinutes(booking.startTime)
      const endMin = timeToMinutes(booking.endTime)
      const rowSpan = Math.ceil((endMin - startMin) / 30)
      courtSlots.set(minutesToTime(startMin), { booking, slotStart: minutesToTime(startMin), rowSpan })
    })
    return map
  }, [sortedCourts, bookings])

  const activeSlots = ALL_SLOTS.slice(0, ALL_SLOTS.length - 1)

  const openSingleBookDialog = (court: Court, slot: string) => {
    const maxAvail = getMaxAvailableMinutes(court.id, slot, bookings)
    const defaultDuration = maxAvail >= 60 ? 60 : maxAvail >= 30 ? 30 : 30
    setBookDialog({ court, startTime: slot })
    setBookDurationMinutes(defaultDuration)
    setGuestName('')
    setGuestPhone('')
    setGuestEmail('')
    setBookError(null)
  }

  const getCellsBetween = (courtID: string, slotA: string, slotB: string): Set<string> => {
    const minA = timeToMinutes(slotA)
    const minB = timeToMinutes(slotB)
    const lo = Math.min(minA, minB)
    const hi = Math.max(minA, minB)
    const result = new Set<string>()
    for (let m = lo; m <= hi; m += 30) {
      const key = `${courtID}:${minutesToTime(m)}`
      // only add if not occupied by a booking
      const courtSlots = cellMap.get(courtID)
      if (!courtSlots) continue
      const isBooked = Array.from(courtSlots.entries()).some(([cellSlot, c]) => {
        const cellStart = timeToMinutes(cellSlot)
        const cellEnd = cellStart + c.rowSpan * 30
        return m >= cellStart && m < cellEnd
      })
      if (!isBooked) result.add(key)
    }
    return result
  }

  const handleCellMouseDown = (courtID: string, slot: string) => {
    if (!selectMode) return
    dragAnchor.current = { courtID, slot }
    setDragPreview(getCellsBetween(courtID, slot, slot))
  }

  const handleCellMouseEnter = (courtID: string, slot: string) => {
    if (!selectMode || !dragAnchor.current) return
    if (dragAnchor.current.courtID !== courtID) return
    setDragPreview(getCellsBetween(courtID, dragAnchor.current.slot, slot))
  }

  const handleCellMouseUp = (courtID: string, slot: string) => {
    if (!selectMode || !dragAnchor.current) return
    if (dragAnchor.current.courtID === courtID) {
      const cells = getCellsBetween(courtID, dragAnchor.current.slot, slot)
      // capture before nulling the ref
      const anchorKey = `${dragAnchor.current.courtID}:${dragAnchor.current.slot}`
      setSelectedCells((prev) => {
        const next = new Set(prev)
        if (prev.has(anchorKey) && cells.size === 1) {
          next.delete(anchorKey)
        } else {
          cells.forEach((k) => next.add(k))
        }
        return next
      })
    }
    dragAnchor.current = null
    setDragPreview(new Set())
  }

  // Cancel drag on mouseup outside table
  useEffect(() => {
    const onMouseUp = () => {
      if (dragAnchor.current) {
        dragAnchor.current = null
        setDragPreview(new Set())
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  const handleSingleBook = async() => {
    if (!bookDialog) return
    try {
      setBookSubmitting(true)
      setBookError(null)
      const endTime = minutesToTime(timeToMinutes(bookDialog.startTime) + bookDurationMinutes)
      await bookingsService.createBundle({
        items: [{ courtID: bookDialog.court.id, date, startTime: bookDialog.startTime, endTime }],
        guestName: guestName || undefined,
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        bookedAsAdmin: true,
      })
      setBookDialog(null)
      await refreshBookings()
    } catch (e) {
      setBookError('Failed to create booking')
      console.error(e)
    } finally {
      setBookSubmitting(false)
    }
  }

  const handleMultiBook = async() => {
    const items = buildBundleItems(selectedCells, date)
    if (items.length === 0) return
    try {
      setBookSubmitting(true)
      setBookError(null)
      await bookingsService.createBundle({
        items,
        guestName: guestName || undefined,
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        bookedAsAdmin: true,
      })
      setMultiBookDialog(false)
      setSelectedCells(new Set())
      await refreshBookings()
    } catch (e) {
      setBookError('Failed to create bookings')
      console.error(e)
    } finally {
      setBookSubmitting(false)
    }
  }

  const handleApprove = async() => {
    if (!detailBooking?.bookingBundleID) return
    try {
      setApproving(true)
      await bookingsService.approvePayment(detailBooking.bookingBundleID)
      setDetailBooking(null)
      await refreshBookings()
    } catch (e) {
      setError('Failed to approve payment')
      console.error(e)
    } finally {
      setApproving(false)
    }
  }

  const handleMarkAsPaid = async() => {
    if (!detailBooking?.id) return
    try {
      setApproving(true)
      await bookingsService.markAsPaid(detailBooking.id)
      setDetailBooking(null)
      await refreshBookings()
    } catch (e) {
      setError('Failed to mark as paid')
      console.error(e)
    } finally {
      setApproving(false)
    }
  }

  const handleCancel = async() => {
    if (!detailBooking) return
    try {
      setCancelling(true)
      await bookingsService.cancel(detailBooking.id)
      setCancelConfirm(false)
      setDetailBooking(null)
      await refreshBookings()
    } catch (e) {
      setError('Failed to cancel booking')
      console.error(e)
    } finally {
      setCancelling(false)
    }
  }

  const multiBookItems = useMemo(() => buildBundleItems(selectedCells, date), [selectedCells, date])
  const courtNameById = useMemo(() => Object.fromEntries(courts.map((c) => [c.id, c.name])), [courts])

  if (initLoading) {
    return (
      <Layout>
        <Container sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Box sx={{ px: { xs: 2, md: 4 }, pt: 2, pb: selectedCells.size > 0 ? 10 : 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => router.push('/admin')} sx={{ mr: 1 }}>
            All Venues
          </Button>
        </Box>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {venue?.name.en || venue?.name.th}
        </Typography>

        {/* Sticky control panel */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.default', pb: 1 }}>
          <Tabs
            value="timetable"
            sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
            onChange={(_, v) => v === 'bookings' && router.push(`/venues/${venueID}/admin/bookings`)}
          >
            <Tab label="Timetable" value="timetable" />
            <Tab label="Payments" value="bookings" />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}

          {/* Toolbar */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton size="small" onClick={() => setDate(moment(date).subtract(1, 'day').format('YYYY-MM-DD'))}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <TextField
                size="small"
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <IconButton size="small" onClick={() => setDate(moment(date).add(1, 'day').format('YYYY-MM-DD'))}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
            <ToggleButton
              value="select"
              selected={selectMode}
              onChange={() => setSelectMode((v) => !v)}
              size="small"
              color="primary"
            >
              <SelectAllIcon sx={{ mr: 0.5, fontSize: 18 }} />
              {selectMode ? 'Selecting' : 'Select Slots'}
            </ToggleButton>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', ml: 1 }}>
              <Box sx={{ width: 14, height: 14, bgcolor: '#bbdefb', border: '1px solid #ccc', borderRadius: 0.5 }} />
              <Typography variant="caption">Unpaid</Typography>
              <Box sx={{ width: 14, height: 14, bgcolor: '#fff9c4', border: '1px solid #ccc', borderRadius: 0.5, ml: 1 }} />
              <Typography variant="caption">Slip Uploaded</Typography>
              <Box sx={{ width: 14, height: 14, bgcolor: '#c8e6c9', border: '1px solid #ccc', borderRadius: 0.5, ml: 1 }} />
              <Typography variant="caption">Paid</Typography>
              {selectMode && (
                <>
                  <Box sx={{ width: 14, height: 14, bgcolor: '#ffe0b2', border: '2px solid #fb8c00', borderRadius: 0.5, ml: 1 }} />
                  <Typography variant="caption">Selected</Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>

        {sortedCourts.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>No active courts found for this venue.</Alert>
        ) : (
          <Paper>
            <Box sx={{
              overflow: 'auto',
              maxHeight: { xs: 'calc(100dvh - 340px)', md: 'calc(100dvh - 350px)' },
            }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th style={{
                        width: 64, minWidth: 64, padding: '8px 4px',
                        background: '#f5f5f5', borderBottom: '2px solid #e0e0e0',
                        borderRight: '1px solid #e0e0e0', fontSize: 12, color: '#666',
                        position: 'sticky', left: 0, top: 0, zIndex: 4,
                      }}>
                        Time
                      </th>
                      {sortedCourts.map((court) => (
                        <th key={court.id} style={{
                          padding: '8px 12px', background: '#f5f5f5',
                          borderBottom: '2px solid #e0e0e0', borderRight: '1px solid #e0e0e0',
                          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'center',
                          position: 'sticky', top: 0, zIndex: 2,
                        }}>
                          {court.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlots.map((slot) => (
                      <tr key={slot}>
                        <td style={{
                          padding: '2px 6px', fontSize: 11, color: '#888',
                          borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #f0f0f0',
                          background: '#fafafa', whiteSpace: 'nowrap', verticalAlign: 'top',
                          position: 'sticky', left: 0, zIndex: 1, height: 36,
                        }}>
                          {slot}
                        </td>
                        {sortedCourts.map((court) => {
                          const courtSlots = cellMap.get(court.id)!
                          const cell = courtSlots.get(slot)

                          const isOccupied = Array.from(courtSlots.entries()).some(([cellSlot, c]) => {
                            if (cellSlot === slot) return false
                            const cellStart = timeToMinutes(cellSlot)
                            const cellEnd = cellStart + c.rowSpan * 30
                            const slotMin = timeToMinutes(slot)
                            return slotMin > cellStart && slotMin < cellEnd
                          })

                          if (isOccupied) return null

                          if (cell) {
                            const { booking, rowSpan } = cell
                            return (
                              <td
                                key={court.id}
                                rowSpan={rowSpan}
                                onClick={() => !selectMode && setDetailBooking(booking)}
                                style={{
                                  background: getStatusColor(booking.status, booking.paymentStatus),
                                  border: '2px solid white',
                                  padding: '4px 8px',
                                  verticalAlign: 'top',
                                  cursor: selectMode ? 'default' : 'pointer',
                                  fontSize: 12,
                                  lineHeight: 1.4,
                                  height: rowSpan * 36,
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{booking.startTime}–{booking.endTime}</div>
                                {(booking.guestName || booking.bookerName) && (
                                  <div style={{ color: '#444' }}>{booking.guestName || booking.bookerName}</div>
                                )}
                                {(booking.guestPhone || booking.bookerPhone) && (
                                  <div style={{ color: '#666', fontSize: 11 }}>{booking.guestPhone || booking.bookerPhone}</div>
                                )}
                                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'rgba(0,0,0,0.08)' }}>
                                  {getStatusLabel(booking.paymentStatus)}
                                </span>
                              </td>
                            )
                          }

                          const cellKey = `${court.id}:${slot}`
                          const isSelected = selectedCells.has(cellKey)
                          const isDragPreview = dragPreview.has(cellKey)

                          return (
                            <td
                              key={court.id}
                              onMouseDown={() => handleCellMouseDown(court.id, slot)}
                              onMouseEnter={() => handleCellMouseEnter(court.id, slot)}
                              onMouseUp={() => handleCellMouseUp(court.id, slot)}
                              onClick={() => {
                                if (!selectMode) openSingleBookDialog(court, slot)
                              }}
                              style={{
                                borderRight: '1px solid #e0e0e0',
                                borderBottom: '1px solid #f0f0f0',
                                height: 36,
                                cursor: selectMode ? 'cell' : 'pointer',
                                background: isSelected ? '#ffe0b2' : isDragPreview ? '#fff3e0' : '',
                                outline: isSelected ? '2px solid #fb8c00' : isDragPreview ? '2px solid #ffb74d' : '',
                                outlineOffset: '-2px',
                                userSelect: 'none',
                              }}
                            />
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Box>
          </Paper>
        )}

        {/* Floating selection bar */}
        {selectedCells.size > 0 && (
          <Paper
            elevation={6}
            sx={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
              px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
              borderTop: '1px solid #e0e0e0', bgcolor: 'background.paper',
            }}
          >
            <Typography variant="body2" sx={{ flex: 1 }}>
              <strong>{selectedCells.size}</strong> slot{selectedCells.size > 1 ? 's' : ''} selected
              {' '}&mdash; {multiBookItems.length} booking item{multiBookItems.length > 1 ? 's' : ''}
            </Typography>
            <Button size="small" onClick={() => setSelectedCells(new Set())}>Clear</Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setGuestName('')
                setGuestPhone('')
                setGuestEmail('')
                setBookError(null)
                setMultiBookDialog(true)
              }}
            >
              Book Selected
            </Button>
          </Paper>
        )}

        {/* Detail dialog */}
        <Dialog open={!!detailBooking} onClose={() => setDetailBooking(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Booking Detail</DialogTitle>
          <DialogContent>
            {detailBooking && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{moment(detailBooking.date).format('DD/MM/YYYY')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Time</Typography>
                  <Typography variant="body2">{detailBooking.startTime} – {detailBooking.endTime}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Amount</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {Number(detailBooking.totalPrice).toFixed(2)} {detailBooking.currency}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Payment</Typography>
                  <Chip
                    size="small"
                    label={getStatusLabel(detailBooking.paymentStatus)}
                    color={
                      detailBooking.paymentStatus === PaymentStatus.Paid ? 'success'
                        : detailBooking.paymentStatus === PaymentStatus.Pending ? 'warning'
                          : 'default'
                    }
                  />
                </Box>
                {(detailBooking.guestName || detailBooking.guestPhone || detailBooking.guestEmail
                  || detailBooking.bookerName || detailBooking.bookerPhone) && (
                  <>
                    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {detailBooking.guestName ? 'Guest' : 'Booker'}
                      </Typography>
                    </Box>
                    {(detailBooking.guestName || detailBooking.bookerName) && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Name</Typography>
                        <Typography variant="body2">{detailBooking.guestName || detailBooking.bookerName}</Typography>
                      </Box>
                    )}
                    {(detailBooking.guestPhone || detailBooking.bookerPhone) && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Phone</Typography>
                        <Typography variant="body2">{detailBooking.guestPhone || detailBooking.bookerPhone}</Typography>
                      </Box>
                    )}
                    {detailBooking.guestEmail && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Email</Typography>
                        <Typography variant="body2">{detailBooking.guestEmail}</Typography>
                      </Box>
                    )}
                  </>
                )}
                {detailBooking.note && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Note</Typography>
                    <Typography variant="body2" sx={{ textAlign: 'right', maxWidth: '60%' }}>{detailBooking.note}</Typography>
                  </Box>
                )}
                {detailBooking.slip && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Payment Slip</Typography>
                    <img
                      src={detailBooking.slip}
                      alt="Payment slip"
                      style={{ width: '100%', marginTop: 8, borderRadius: 4, maxHeight: 300, objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {detailBooking?.status !== BookingStatus.Cancelled && (
              <Button color="error" onClick={() => setCancelConfirm(true)} sx={{ mr: 'auto' }} disabled={approving}>
                Cancel Booking
              </Button>
            )}
            {detailBooking?.paymentStatus === PaymentStatus.Unpaid
              && detailBooking?.status !== BookingStatus.Cancelled && (
              <Button variant="contained" color="success" onClick={handleMarkAsPaid} disabled={approving}>
                {approving ? <CircularProgress size={18} /> : 'Mark as Paid'}
              </Button>
            )}
            {detailBooking?.paymentStatus === PaymentStatus.Pending && (
              <Button variant="contained" color="success" onClick={handleApprove} disabled={approving}>
                {approving ? <CircularProgress size={18} /> : 'Approve Payment'}
              </Button>
            )}
            <Button onClick={() => setDetailBooking(null)} disabled={approving}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Cancel confirmation dialog */}
        <Dialog open={cancelConfirm} onClose={() => !cancelling && setCancelConfirm(false)} maxWidth="xs">
          <DialogTitle>Cancel Booking?</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to cancel this booking? This cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelConfirm(false)} disabled={cancelling}>Keep</Button>
            <Button color="error" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <CircularProgress size={18} /> : 'Cancel Booking'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Single-cell booking dialog */}
        <Dialog open={!!bookDialog} onClose={() => !bookSubmitting && setBookDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>New Booking — {bookDialog?.court.name}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
            {bookError && <Alert severity="error" sx={{ mb: 1 }}>{bookError}</Alert>}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField size="small" label="Date" value={date} InputProps={{ readOnly: true }} fullWidth />
              <TextField size="small" label="Start" value={bookDialog?.startTime || ''} InputProps={{ readOnly: true }} fullWidth />
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select label="Duration" value={bookDurationMinutes} onChange={(e) => setBookDurationMinutes(Number(e.target.value))}>
                {bookDialog && getDurationOptions(bookDialog.startTime, getMaxAvailableMinutes(bookDialog.court.id, bookDialog.startTime, bookings)).map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider />
            <TextField size="small" label="Guest Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} fullWidth />
            <TextField size="small" label="Guest Phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} fullWidth />
            <TextField size="small" label="Guest Email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBookDialog(null)} disabled={bookSubmitting}>Cancel</Button>
            <Button variant="contained" onClick={handleSingleBook} disabled={bookSubmitting}>
              {bookSubmitting ? <CircularProgress size={18} /> : 'Book'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Multi-select booking dialog */}
        <Dialog open={multiBookDialog} onClose={() => !bookSubmitting && setMultiBookDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Book Selected Slots</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
            {bookError && <Alert severity="error" sx={{ mb: 1 }}>{bookError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {multiBookItems.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" label={courtNameById[item.courtID] ?? item.courtID} />
                  <Typography variant="body2">{item.startTime} – {item.endTime}</Typography>
                </Box>
              ))}
            </Box>
            <Divider />
            <TextField size="small" label="Guest Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} fullWidth />
            <TextField size="small" label="Guest Phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} fullWidth />
            <TextField size="small" label="Guest Email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMultiBookDialog(false)} disabled={bookSubmitting}>Cancel</Button>
            <Button variant="contained" onClick={handleMultiBook} disabled={bookSubmitting}>
              {bookSubmitting ? <CircularProgress size={18} /> : `Book ${multiBookItems.length} item${multiBookItems.length > 1 ? 's' : ''}`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
