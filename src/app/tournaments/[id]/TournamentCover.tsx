'use client'
import LoginModal from '@/app/components/LoginModal'
import RegisterEventForm from '@/app/components/RegisterEventModal'
import { RootState } from '@/app/libs/redux/store'
import { useSelector } from '@/app/providers'
import { Tournament } from '@/type'
import { CalendarMonth, LocationOn } from '@mui/icons-material'
import { Box, Button, Container, Typography } from '@mui/material'
import moment from 'moment'
import Image from 'next/image'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  tournament: Tournament
}

const TournamentCover = ({ tournament }: Props) => {
  const { t } = useTranslation()
  const [registerModalVisible, setRegisterModalVisible] = useState(false)
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const user = useSelector((state: RootState) => state.app.user)
  const language = useSelector((state: RootState) => state.app.language)

  const handleClickRegister = () => {
    if(!user){
      setLoginModalVisible(true)
    }else{
      setRegisterModalVisible(true)
    }
  }

  return (
    <Box sx={{ width: '100%', backgroundColor: '#80644f' }}>
      <Container maxWidth="xl" sx={{ p: 2, display:'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box
          component="section"
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center' }}>
          <div>
            <Image
              src={tournament.logo || '/avatar.png'}
              alt={tournament.name[language]}
              width={200}
              height={200}
              className='rounded-full shadow-md object-cover'
            />
          </div>
        </Box>

        <Box component="section" sx={{ p: 2,  width: '100%', display: 'flex', flexDirection: 'column', alignItems:{ xs: 'center', md: 'flex-start' } }}>
          <div className='text-gray-200'>
            <h1 className='text-2xl'>{tournament.name[language]}</h1>
            <Box sx={{ pt:1  }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}><LocationOn/><Typography>{tournament.venue.name.en}</Typography></Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}><CalendarMonth/><Typography>{`${moment(tournament.startDate).format('DD MMM YYYY')} ${tournament.startDate !== tournament.endDate && `to ${moment(tournament.endDate).format('DD MMM YYYY')}`}`}</Typography></Box>
            </Box>
          </div>
          <Box sx={{ paddingTop: 3 }}>
            <Button
              variant='contained'
              size="large"
              onClick={handleClickRegister}
              sx={{ borderRadius: 5, backgroundColor: '#ff7961' }}>{t('tournament.registration.registerConfirm')}</Button>
          </Box>
        </Box>
      </Container>
      <RegisterEventForm
        tournamentLanguage={tournament.language}
        events={tournament.events}
        visible={registerModalVisible}
        setVisible={setRegisterModalVisible}/>
      <LoginModal visible={loginModalVisible} setVisible={setLoginModalVisible}/>
    </Box>
  )
}

export default TournamentCover