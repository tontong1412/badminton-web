'use client'
import FloatingAddButton from '@/app/components/FloatingAddButton'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import LoginModal from '@/app/components/LoginModal'
import PaymentModal from '@/app/components/PaymentModal'
import RegisterEventForm from '@/app/components/RegisterEventModal'
import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS } from '@/app/constants'
import { useMyEvents, useTournament } from '@/app/libs/data'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import { Event, EventTeam, Language, Player, TeamStatus, TournamentMenu } from '@/type'
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, CircularProgress, Container, Divider, Typography } from '@mui/material'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'


const Me = () => {
  const { t } = useTranslation()
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [isManager, setIsManager] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<EventTeam | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const [registerModalVisible, setRegisterModalVisible] = useState(false)
  const { tournament }  = useTournament(params.id as string)
  const { myEvents, mutate: fetchMyEvents } = useMyEvents(params.id as string)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Me))
  }, [dispatch])

  useEffect(() => {
    fetchMyEvents()
  }, [user])

  useEffect(() => {
    if(user && tournament && tournament.managers?.map((m) => m.id)?.includes(user?.player.id)){
      setIsManager(true)
    }else{
      setIsManager(false)
    }
  }, [user, tournament])

  const setEvent = () => {
    fetchMyEvents()
  }

  const handleClickRegister = () => {
    if(!user){
      setLoginModalVisible(true)
    }else{
      setRegisterModalVisible(true)
    }
  }

  useEffect(() => {
    if(selectedEvent && selectedTeam){
      const updatedEvent = myEvents.find((e) => e.id === selectedEvent?.id)
      const updatedTeam = updatedEvent?.teams.find((t) => t.id === selectedTeam?.id)
      setSelectedTeam(updatedTeam || null)
    }
  }, [myEvents])

  const renderContent = () => {
    if(!tournament || !myEvents){
      return <CircularProgress/>
    }else if(myEvents.length < 1){
      return (<>
        <Container maxWidth="xl" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant='h5'>{t('tournament.registration.noRegistration')}</Typography>
          <Box sx={{ paddingTop: 3 }}>
            <Button
              variant='contained'
              size="large"
              onClick={handleClickRegister}
              color='error'
              sx={{ borderRadius: 5 }}>{t('tournament.registration.registerConfirm')}</Button>
          </Box>
        </Container>
      </>)
    }else{
      return (
        <Container maxWidth="xl" sx={{ p: 2 }}>
          <Divider sx={{ pt:2, pb:2 }}><Typography variant='h5' >รายการที่สมัคร</Typography></Divider>
          <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '5px', overflowX: 'scroll', flexDirection:'column' }}>
            {
              myEvents.map((event) => (
                <Fragment key={event.id}>
                  {
                    event.teams.map((team) => (
                      <Card key={team.id} sx={{ marginBottom: 2, mt:'1px', mr:'1px', ml:'1px', minWidth: '95%' }}>
                        <CardHeader
                          sx={{ borderBottom: '1px solid #ddd' }}
                          action={
                            <Box>
                              <Chip
                                size='small'
                                sx={{ marginRight: '3px' }}
                                label={MAP_DECISION_STATUS[team.status][language]}
                                variant='outlined'
                                color={MAP_DECISION_STATUS[team.status].color} />
                              <Chip
                                size='small'
                                label={MAP_PAYMENT_STATUS[team.paymentStatus][language]}
                                variant='outlined'
                                color={MAP_PAYMENT_STATUS[team.paymentStatus].color} />
                            </Box>
                          }
                          title={<Typography variant='h5' >{t('tournament.registration.event')} {event.name[language]}</Typography>}
                        />
                        <CardContent>
                          <Box >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box >
                                {team.players.map((p: Player) => <div key={p.id}>
                                  <Box sx={{ display: 'flex' }}>
                                    <div key={p.id}>
                                      <Typography width={150}>{p.officialName[language]}</Typography>
                                    </div>
                                    <Typography>{p.club}</Typography>
                                  </Box>
                                </div>)}
                              </Box>
                              <Box sx={{ display: 'flex', gap: '5px' }}>
                                <div style={{ position: 'relative', width: '20px', height: 'auto' }}>
                                  <Image alt='shuttle-icon' src='/shuttlecock.png' fill style={{ objectFit: 'contain' }}/>
                                </div>
                                <Typography>{team.shuttlecockCredit}</Typography>
                              </Box>
                            </Box>
                            {team.note && <Typography sx={{ pt:2 }}>{`${t('tournament.registration.note')}: ${team.note}`}</Typography>}
                          </Box>

                        </CardContent>

                        <CardActions sx={{ display: 'flex', justifyContent: team.status === TeamStatus.Idle ?  'space-between' : 'center', borderTop: '1px solid #ddd', p:0 }}>
                          <div style={{ width: '100%', textAlign: 'center' }}>
                            <Button fullWidth size="small" onClick={() => {
                              setPaymentModalVisible(true)
                              setSelectedTeam(team)
                              setSelectedEvent(event)
                            }}>{t('tournament.registration.uploadSlip')}</Button>
                          </div>
                        </CardActions>
                      </Card>
                    ))
                  }
                </Fragment>
              ))
            }
          </Box>
          {selectedTeam && selectedEvent && <PaymentModal visible={paymentModalVisible} setVisible={setPaymentModalVisible} event={selectedEvent} team={selectedTeam} setEvent={setEvent} isManager={isManager} setTeam={setSelectedTeam}/>}
        </Container>
      )
    }
  }

  return (
    <TournamentLayout tournament={tournament}>
      {renderContent()}
      <FloatingAddButton onClick={handleClickRegister}/>
      {tournament && <RegisterEventForm
        onFinishRegister={fetchMyEvents}
        tournamentLanguage={tournament.language}
        events={tournament.events}
        visible={registerModalVisible}
        setVisible={setRegisterModalVisible}/>}
      <LoginModal visible={loginModalVisible} setVisible={setLoginModalVisible}/>
    </TournamentLayout>
  )

}
export default Me