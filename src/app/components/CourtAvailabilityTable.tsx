'use client'

import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { BookingAvailability, Court } from '@/type'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

const addMinutes = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

interface CourtAvailabilityTableProps {
  courts: Court[]
  availabilityByCourt: BookingAvailability[]
  selectedDate: string
  slotDurationMinutes: number
  selectedCells: Map<string, Set<string>> // courtId -> Set<startTime>
  onCellClick: (startTime: string, court: Court) => void
  loading?: boolean
}

export default function CourtAvailabilityTable({
  courts,
  availabilityByCourt,
  selectedDate,
  slotDurationMinutes,
  selectedCells,
  onCellClick,
  loading,
}: CourtAvailabilityTableProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Box sx={{ py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (courts.length === 0 || availabilityByCourt.length === 0) {
    return null
  }

  // Collect unique future start times and their corresponding booking endTime from the API
  // Rows are displayed at slotDurationMinutes width; the full booking endTime is preserved for onCellClick
  const startTimeMap = new Map<string, string>() // startTime -> bookingEndTime
  availabilityByCourt.forEach((avail) => {
    avail.slots.forEach((slot) => {
      const slotStart = moment(`${selectedDate} ${slot.startTime}`, 'YYYY-MM-DD HH:mm')
      if (slotStart.isAfter(moment()) && !startTimeMap.has(slot.startTime)) {
        startTimeMap.set(slot.startTime, slot.endTime)
      }
    })
  })

  const sortedSlots = Array.from(startTimeMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([startTime, endTime]) => ({ startTime, endTime }))

  // Build lookup: courtId -> startTime -> available
  const availabilityMap = new Map<string, Map<string, boolean>>()
  availabilityByCourt.forEach((avail) => {
    const courtSlotMap = new Map<string, boolean>()
    avail.slots.forEach((slot) => {
      courtSlotMap.set(slot.startTime, slot.available)
    })
    availabilityMap.set(avail.court.id, courtSlotMap)
  })

  if (sortedSlots.length === 0) {
    return null
  }

  return (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
        {t('booking.availabilityTable')}
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 130, whiteSpace: 'nowrap', bgcolor: 'grey.100' }}>
                {t('booking.time')}
              </TableCell>
              {courts.map((court) => (
                <TableCell
                  key={court.id}
                  align="center"
                  sx={{ fontWeight: 700, minWidth: 100, whiteSpace: 'nowrap', bgcolor: 'grey.100' }}
                >
                  {court.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedSlots.map((slot) => {
              const displayEnd = addMinutes(slot.startTime, slotDurationMinutes)
              const isRowHighlighted = Array.from(selectedCells.values()).some((times) => times.has(slot.startTime))

              return (
                <TableRow
                  key={slot.startTime}
                  sx={{
                    backgroundColor: isRowHighlighted ? 'primary.50' : 'inherit',
                    '&:hover': { backgroundColor: isRowHighlighted ? 'primary.50' : 'action.hover' },
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: isRowHighlighted ? 700 : 400,
                      whiteSpace: 'nowrap',
                      color: isRowHighlighted ? 'primary.main' : 'inherit',
                    }}
                  >
                    {slot.startTime} – {displayEnd}
                  </TableCell>
                  {courts.map((court) => {
                    const courtSlotMap = availabilityMap.get(court.id)
                    const available = courtSlotMap?.get(slot.startTime) ?? false
                    const isSelectedCell = selectedCells.get(court.id)?.has(slot.startTime) ?? false

                    return (
                      <TableCell key={court.id} align="center" sx={{ py: 0.5 }}>
                        {available ? (
                          <Tooltip title={t('booking.available')}>
                            <CheckCircleIcon
                              color={isSelectedCell ? 'primary' : 'success'}
                              sx={{
                                cursor: 'pointer',
                                fontSize: 22,
                                transition: 'transform 0.1s',
                                '&:hover': { transform: 'scale(1.2)' },
                              }}
                              onClick={() => onCellClick(slot.startTime, court)}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title={t('booking.unavailable')}>
                            <CancelIcon color="disabled" sx={{ fontSize: 22 }} />
                          </Tooltip>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
