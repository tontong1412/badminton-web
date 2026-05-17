'use client'
import {
  Card,
  CardContent,
  Button,
  Container,
  Typography,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from './libs/redux/store'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { setActiveMenu } from './libs/redux/slices/appSlice'
import { AppMenu, BookingStatus, Court, Language, PaymentStatus, TournamentQuery, Venue } from '@/type'
import { useAppDispatch } from './providers'
import Layout from './components/Layout'
import TournamentList from './tournaments/TounamentList'
import Link from 'next/link'
import { useMyBookings } from './libs/data'
import moment from 'moment'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import courtsService from './services/courts'
import venueService from './services/venues'

const paymentChipProps = (status: PaymentStatus) => {
  if (status === PaymentStatus.Paid) return { label: 'Paid', color: 'success' as const }
  if (status === PaymentStatus.Pending) return { label: 'Pending', color: 'warning' as const }
  return { label: 'Unpaid', color: 'error' as const }
}

const Home = () => {
  const dispatch = useAppDispatch()
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { t } = useTranslation()
  const { bookings, isLoading } = useMyBookings()
  const [courtDetails, setCourtDetails] = useState<Record<string, Court>>({})
  const [venueDetails, setVenueDetails] = useState<Record<string, Venue>>({})

  const upcomingBookings = useMemo(() => {
    const today = moment().format('YYYY-MM-DD')
    const now = moment()
    return bookings
      .filter((b) => {
        if (b.status === BookingStatus.Cancelled) return false
        if (b.date < today) return false
        if (b.date === today && moment(`${b.date} ${b.startTime}`, 'YYYY-MM-DD HH:mm').isBefore(now)) return false
        return true
      })
      .sort((a, b) => {
        const ta = `${a.date} ${a.startTime}`
        const tb = `${b.date} ${b.startTime}`
        return ta < tb ? -1 : ta > tb ? 1 : 0
      })
      .slice(0, 1)
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

  useEffect(() => {
    dispatch(setActiveMenu(AppMenu.Home))
  }, [dispatch])

  return (
    <Layout>
      <Container>
        <Typography sx={{ mt: 4, mb: 2, color: '#80644f' }} variant="h5">
          {t('greeting')}, {user?.player?.displayName?.[language] || user?.player?.officialName[language]}
        </Typography>

        <TournamentList query={TournamentQuery.RegistrationOpen} label={t('tournament.title')} />

        {user && (
          <>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} sx={{ color: '#80644f' }} />
              </Box>
            ) : upcomingBookings.length > 0 ? (
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
                          {/* Venue header */}
                          {venue && (
                            <Box sx={{ mb: 1.25 }}>
                              <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                {venue.name.en || venue.name.th}
                              </Typography>
                            </Box>
                          )}
                          {/* Date / time / price row */}
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
            ) : null}
          </>
        )}
      </Container>
    </Layout>
  )
}

export default Home
