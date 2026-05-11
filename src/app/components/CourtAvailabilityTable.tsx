'use client'

import {
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { BookingAvailability, Court, CourtPricingRule } from '@/type'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

const getSlotPrice = (court: Court, startTime: string, slotDurationMinutes: number): number => {
  const rules = court.pricingRules ?? []
  const segStart = toMins(startTime)
  const segEnd = segStart + slotDurationMinutes
  if (rules.length === 0) return Number(((court.pricePerHour / 60) * slotDurationMinutes).toFixed(2))

  const boundaries = new Set<number>([segStart, segEnd])
  for (const rule of rules) {
    const rs = toMins(rule.startTime), re = toMins(rule.endTime)
    if (rs > segStart && rs < segEnd) boundaries.add(rs)
    if (re > segStart && re < segEnd) boundaries.add(re)
  }
  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  let total = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i], e = sorted[i + 1]
    const rule = rules.find((r: CourtPricingRule) => toMins(r.startTime) <= s && toMins(r.endTime) >= e)
    total += ((rule ? rule.pricePerHour : court.pricePerHour) / 60) * (e - s)
  }
  return Number(total.toFixed(2))
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
  const reasonMap = new Map<string, Map<string, string>>() // courtId -> startTime -> reason
  availabilityByCourt.forEach((avail) => {
    const courtSlotMap = new Map<string, boolean>()
    const courtReasonMap = new Map<string, string>()
    avail.slots.forEach((slot) => {
      courtSlotMap.set(slot.startTime, slot.available)
      if (!slot.available && slot.reason) {
        courtReasonMap.set(slot.startTime, slot.reason)
      }
    })
    availabilityMap.set(avail.court.id, courtSlotMap)
    reasonMap.set(avail.court.id, courtReasonMap)
  })

  if (sortedSlots.length === 0) {
    return null
  }

  return (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
        {t('booking.availabilityTable')}
      </Typography>
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{
                fontWeight: 700, whiteSpace: 'nowrap', background: '#f5f5f5',
                padding: '8px 12px', borderBottom: '2px solid #e0e0e0', borderRight: '1px solid #e0e0e0',
                textAlign: 'left', fontSize: 13,
                position: 'sticky', left: 0, top: 0, zIndex: 3,
              }}>
                {t('booking.time')}
              </th>
              {courts.map((court) => (
                <th key={court.id} style={{
                  fontWeight: 700, whiteSpace: 'nowrap', background: '#f5f5f5',
                  padding: '8px 12px', borderBottom: '2px solid #e0e0e0', borderRight: '1px solid #e0e0e0',
                  textAlign: 'center', fontSize: 13, minWidth: 100,
                  position: 'sticky', top: 0, zIndex: 2,
                }}>
                  {court.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSlots.map((slot) => {
              return (
                <tr key={slot.startTime}>
                  <td style={{
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                    padding: '6px 12px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #e0e0e0',
                    fontSize: 13, background: '#fff',
                    position: 'sticky', left: 0, zIndex: 1,
                    boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
                  }}>
                    {slot.startTime}
                  </td>
                  {courts.map((court) => {
                    const courtSlotMap = availabilityMap.get(court.id)
                    const available = courtSlotMap?.get(slot.startTime) ?? false
                    const isSelectedCell = selectedCells.get(court.id)?.has(slot.startTime) ?? false
                    const reason = reasonMap.get(court.id)?.get(slot.startTime)
                    const bookedTime = reason?.match(/(\d{2}:\d{2}-\d{2}:\d{2})/)?.[1]
                    return (
                      <td key={court.id} style={{ textAlign: 'center', padding: '4px 8px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #e0e0e0', background: available ? undefined : '#fafafa' }}>
                        {available ? (
                          <div
                            onClick={() => onCellClick(slot.startTime, court)}
                            style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <CheckCircleIcon
                              color={isSelectedCell ? 'primary' : 'success'}
                              sx={{
                                fontSize: 22,
                                transition: 'transform 0.1s',
                                '&:hover': { transform: 'scale(1.2)' },
                              }}
                            />
                            <span style={{ fontSize: 10, color: '#666', lineHeight: 1.2, marginTop: 2 }}>
                              {getSlotPrice(court, slot.startTime, slotDurationMinutes).toFixed(0)} {court.currency}
                            </span>
                          </div>
                        ) : bookedTime ? null : (
                          <CancelIcon color="disabled" sx={{ fontSize: 22 }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Paper>
    </Box>
  )
}
