'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import LoginModal from '@/app/components/LoginModal'
import PaymentModal from '@/app/components/PaymentModal'
import RegisterEventForm from '@/app/components/RegisterEventModal'
import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, SERVICE_ENDPOINT } from '@/app/constants'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import { Event, EventTeam, Language, Player, TeamStatus, Tournament, TournamentMenu } from '@/type'
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Container, Divider, Typography } from '@mui/material'
import axios from 'axios'
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
  const [tournament, setTournament] = useState<Tournament>()
  const [isManager, setIsManager] = useState(false)
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<EventTeam | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const [registerModalVisible, setRegisterModalVisible] = useState(false)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Me))
  }, [dispatch])

  useEffect(() => {
    const fetchTournament = async() => {
      try {
        const response = await axios.get(`${SERVICE_ENDPOINT}/tournaments/${params.id}`)
        setTournament(response.data)
      } catch (error) {
        console.error('Error fetching tournament:', error)
      }
    }
    fetchTournament()
    fetchMyEvents()
  }, [])

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

  const fetchMyEvents = async() => {
    try {
      const response = await axios.get(`${SERVICE_ENDPOINT}/events/my-events?tournamentID=${params.id}`, { withCredentials: true })
      setMyEvents(response.data)
    } catch (error){
      console.log('Error fetching my events:', error)
      setMyEvents([])
    }
  }

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

  if(myEvents.length < 1 && tournament){
    return <TournamentLayout isManager={isManager}>
      <Container maxWidth="xl" sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant='h5'>{t('tournament.registration.noRegistration')}</Typography>
        {!user &&  <Box sx={{ paddingTop: 3 }}>
          <Button
            variant='contained'
            size="large"
            onClick={handleClickRegister}
            sx={{ borderRadius: 5, backgroundColor: '#ff7961' }}>{t('tournament.registration.registerConfirm')}</Button>
        </Box>}
      </Container>
      <RegisterEventForm
        tournamentLanguage={tournament.language}
        events={tournament.events}
        visible={registerModalVisible}
        setVisible={setRegisterModalVisible}/>
      <LoginModal visible={loginModalVisible} setVisible={setLoginModalVisible}/>
    </TournamentLayout>
  }

  return (
    <TournamentLayout isManager={isManager}>
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
    </TournamentLayout>
  )

}
export default Me