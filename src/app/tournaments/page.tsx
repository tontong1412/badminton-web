'use client'
import { AppMenu, TournamentQuery } from '@/type'
import { Container, Typography } from '@mui/material'
import TournamentList from './TounamentList'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../providers'
import { useEffect } from 'react'
import { setActiveMenu } from '../libs/redux/slices/appSlice'
import Layout from '../components/Layout'

const Tournaments = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(setActiveMenu(AppMenu.Tournament))
  }, [dispatch])
  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt:2 }}>
        <Typography gutterBottom variant="h5" component="div">{t('tournament.thisWeek')}</Typography>
        <TournamentList query={TournamentQuery.ThisWeek} />
        <Typography gutterBottom variant="h5" component="div">{t('tournament.registrationOpen')}</Typography>
        <TournamentList query={TournamentQuery.RegistrationOpen}  />
        <Typography gutterBottom variant="h5" component="div">{t('tournament.recent')}</Typography>
        <TournamentList query={TournamentQuery.Recent}  />
      </Container>
    </Layout>
  )
}

export default Tournaments