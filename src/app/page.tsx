'use client'
import {
  // Box, Button,
  Card,
  CardContent,
  CardActions,
  Button,
  Container,
  Typography,
} from '@mui/material'
// import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from './libs/redux/store'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { setActiveMenu } from './libs/redux/slices/appSlice'
import { AppMenu, Language, TournamentQuery } from '@/type'
import { useAppDispatch } from './providers'
import Layout from './components/Layout'
import TournamentList from './tournaments/TounamentList'
import Link from 'next/link'

const Home = () => {
  // const router = useRouter()
  const dispatch = useAppDispatch()
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { t } = useTranslation()

  useEffect(() => {
    dispatch(setActiveMenu(AppMenu.Home))
  }, [dispatch])

  return (
    <Layout>
      <Container>
        <Typography sx={{ mt: 4, mb: 2, color: '#80644f' }} variant="h5">{t('greeting')}, {user?.player?.displayName?.[language] || user?.player?.officialName[language]}
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#80644f', fontWeight: 600 }}>
              {t('booking.myBookings')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('booking.bookCourt')} / {t('booking.myBookings')}
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Link href="/bookings" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary">
                {t('booking.myBookings')}
              </Button>
            </Link>
          </CardActions>
        </Card>

        <TournamentList query={TournamentQuery.RegistrationOpen} label={t('tournament.title')} />
        {/* <Button data-test-id='button-to-session' variant='contained' size="large" onClick={() => router.push('/sessions')}>Host a Session</Button> */}
      </Container>
    </Layout>
  )
}

export default Home
