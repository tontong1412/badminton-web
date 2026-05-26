'use client'
import {
  Container,
  Typography,
} from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from './libs/redux/store'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { setActiveMenu } from './libs/redux/slices/appSlice'
import { AppMenu, Language, TournamentQuery } from '@/type'
import { useAppDispatch } from './providers'
import Layout from './components/Layout'
import HomeBanner from './components/HomeBanner'
import TournamentList from './tournaments/TounamentList'
import UpcomingBookings from './components/UpcomingBookings'

const Home = () => {
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
        <HomeBanner />
        <Typography sx={{ mt: 2, mb: 2, color: '#80644f' }} variant="h5">
          {t('greeting')}, {user?.player?.displayName?.[language] || user?.player?.officialName[language]}
        </Typography>

        <TournamentList query={TournamentQuery.RegistrationOpen} label={t('tournament.title')} />

        {user && <UpcomingBookings />}
      </Container>
    </Layout>
  )
}

export default Home
