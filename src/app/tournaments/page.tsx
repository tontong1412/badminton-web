'use client'
import { AppMenu, TournamentQuery } from '@/type'
import { Container } from '@mui/material'
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
      <Container maxWidth="xl">
        <TournamentList query={TournamentQuery.ThisWeek} label={t('tournament.thisWeek')} />
        <TournamentList query={TournamentQuery.RegistrationOpen} label={t('tournament.registrationOpen')} />
        <TournamentList query={TournamentQuery.Recent} label={t('tournament.recent')} />
      </Container>
    </Layout>
  )
}

export default Tournaments