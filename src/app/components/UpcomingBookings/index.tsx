'use client'
import { Card, CardContent, Button, Typography, Box, Chip, CircularProgress } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { BookingStatus, Court, PaymentStatus, Venue } from '@/type'
import { useMyBookings } from '@/app/libs/data'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import moment from 'moment'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import courtsService from '@/app/services/courts'
import venueService from '@/app/services/venues'

const paymentChipProps = (status: PaymentStatus) => {
  if (status === PaymentStatus.Paid) return { label: 'Paid', color: 'success' as const }
  if (status === PaymentStatus.Pending) return { label: 'Pending', color: 'warning' as const }
  return { label: 'Unpaid', color: 'error' as const }
}

const UpcomingBookings = () => {
  const { t } = useTranslation()
  const { bookings, isLoading } = useMyBookings()
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [venueDetails, setVenueDetails] = useState<Record<string, Venue>>({})

  const upcomingBookings = useMemo(() => {
    const now = moment()
    const filtered = bookings
      .filter((b) => {
        if (b.status === BookingStatus.Cancelled) return false
        if (moment(`${b.date} ${b.endTime}`, 'YYYY-MM-DD HH:mm').isBefore(now)) return false
        return true
      })
      .sort((a, b) => {
        const ta = `${a.date} ${a.startTime}`
        const tb = `${b.date} ${b.startTime}`
        return ta < tb ? -1 : ta > tb ? 1 : 0
      })
    const seenBundles = new Set<string>()
    const deduped = filtered.filter((b) => {
      const key = b.bookingBundleID || b.id
      if (seenBundles.has(key)) return false
      seenBundles.add(key)
      return true
    })
    return deduped.slice(0, 1)
  }, [bookings])

  useEffect(() => {
    if (!upcomingBookings.length) return
    const load = async() => {
      const courts: Record<string, Court> = { ...courtDetails }
      const venues: Record<string, Venue> = { ...venueDetails }
      const newCourtIds = upcomingBookings.map((b) => b.courtID).filter((id) => !courts[id])
      for (const courtId of newCourtIds) {
        try {
          const court = await courtsService.getById(courtId)
          courts[courtId] = court
          if (!venues[court.venueID]) {
            const venue = await venueService.getById(court.venueID)
            venues[court.venueID] = venue
          }
        } catch { /* non-critical */ }
      }
      setCourtDetails(courts)
      setVenueDetails(venues)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingBookings])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} sx={{ color: '#80644f' }} />
      </Box>
    )
  }

  if (!upcomingBookings.length) return null

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#80644f', mb: 1.5 }}>
        {t('booking.myBookings')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {upcomingBookings.map((booking) => {
          const court = courtDetails[booking.courtID]
          const venue = court ? venueDetails[court.venueID] : undefined
          return (
            <Card key={booking.id} variant="outlined" sx={{ borderColor: '#e8d8c8', borderRadius: 2 }}>
              <CardContent sx={{ pb: '12px !important' }}>
                {venue && (
                  <Box sx={{ mb: 1.25 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {venue.name.en || venue.name.th}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
                      <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: '#80644f' }} />
                      <Typography variant="body2" fontWeight={600}>
                        {moment(booking.date).format('ddd, D MMM YYYY')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <AccessTimeIcon sx={{ fontSize: 13, color: '#80644f' }} />
                      <Typography variant="body2" color="text.secondary">
                        {booking.startTime} – {booking.endTime}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Chip size="small" {...paymentChipProps(booking.paymentStatus)} />
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#80644f' }}>
                      {booking.totalPrice.toLocaleString()} {booking.currency}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>
      <Box sx={{ mt: 1.5, textAlign: 'right' }}>
        <Link href="/bookings" style={{ textDecoration: 'none' }}>
          <Button size="small" sx={{ color: '#80644f' }}>{t('booking.myBookings')} →</Button>
        </Link>
      </Box>
    </Box>
  )
}

export default UpcomingBookings
