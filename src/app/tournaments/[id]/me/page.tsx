'use client'
import FloatingAddButton from '@/app/components/FloatingAddButton'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import LoginModal from '@/app/components/LoginModal'
import PaymentModal from '@/app/components/PaymentModal'
import RegisterEventForm from '@/app/components/RegisterEventModal'
import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, MAP_ROUND_NAME } from '@/app/constants'
import { useMatchesTournament, useMyEvents, useMyMatches, useTournament } from '@/app/libs/data'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import { Event, EventTeam, Language, Match, MatchStatus, Player, TeamStatus, TournamentMenu, TournamentStatus } from '@/type'
import { Avatar, Box, Button, Card, CardActions, CardContent, CardHeader, Chip, CircularProgress, Container, Divider, Typography } from '@mui/material'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styles from '../draw/Bracket/MatchList.module.scss'
import MatchUp from '../draw/Bracket/MatchUp'
import moment from 'moment'


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
  const { myMatches, mutate: fetchMyMatches } = useMyMatches(params.id as string)
  const { matches } = useMatchesTournament(params.id as string)
  const [lastMatchAnnounced, setLastMatchAnnounced] = useState<Match>()
  const [myNextMatch, setMyNextMatch] = useState<Match>()

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

  const handleClickRegister = () => {
    if(!user){
      setLoginModalVisible(true)
    }else{
      setRegisterModalVisible(true)
    }
  }
  const sortMatch = (a: Match, b: Match) => {
    if(!a.matchNumber || !b.matchNumber){
      return 0
    }
    return a.matchNumber - b.matchNumber
  }
  useEffect(() => {
    if(matches){
      const lastMatch = matches.filter((m) => m.status === MatchStatus.Playing).sort((a, b) => sortMatch(b, a))
      console.log(lastMatch)
      setLastMatchAnnounced(lastMatch[0])
    }
  }, [matches])

  useEffect(() => {
    if(myMatches){
      const myNextMatchTemp = myMatches.filter((m) => m.status === MatchStatus.Waiting).sort(sortMatch)[0]
      setMyNextMatch(myNextMatchTemp)
    }
  }, [myMatches])

  useEffect(() => {
    fetchMyMatches()
  }, [tournament, user])

  useEffect(() => {
    if(selectedEvent && selectedTeam){
      const updatedEvent = myEvents.find((e) => e.id === selectedEvent?.id)
      const updatedTeam = updatedEvent?.teams.find((t) => t.id === selectedTeam?.id)
      setSelectedTeam(updatedTeam || null)
    }
  }, [myEvents])

  const getNextMatchText = () => {

    const waitNum = (myNextMatch?.matchNumber ?? 0) - (lastMatchAnnounced?.matchNumber ?? 0) - 1

    const firstMatchInQueue = matches.filter((m) => m.status === MatchStatus.Waiting).sort(sortMatch)[0]

    const minsLate = moment().diff(moment(firstMatchInQueue.date), 'minutes')
    let lateText = ''
    if(minsLate <= 30){
      lateText = 'ตรงเวลา'
    }else if(minsLate > 30 && minsLate <= 45){
      lateText = 'ช้ากว่ากำหนด ประมาณ 30 นาที'
    }else if(minsLate > 45 && minsLate <= 60){
      lateText = 'ช้ากว่ากำหนด ประมาณ 45 นาที'
    }else if(minsLate > 60 && minsLate <= 75){
      lateText = 'ช้ากว่ากำหนด ประมาณ 60 นาที'
    }else{
      lateText = 'ช้ากว่ากำหนดมากกว่า 60 นาที'
    }

    if(waitNum > 0){
      return <div>
        <div style={{ color: '#80644f', fontSize: 20 }}>อีก <span style={{ fontSize: 26 }}>{waitNum}</span> คู่</div>
        <Typography sx={{ color:'#999' }}>{lateText}</Typography>
      </div>
    }else{
      return <div style={{ color: '#80644f', fontSize: 26 }}>คู่ต่อไป</div>
    }

  }

  const renderContent = () => {
    if(!tournament || !myEvents || !myMatches){
      return <CircularProgress/>
    } else if(tournament.status === TournamentStatus.RegistrationOpen && myEvents.length < 1){
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
    } else if (tournament.status === TournamentStatus.RegistrationOpen) {
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
          {selectedTeam && selectedEvent && <PaymentModal visible={paymentModalVisible} setVisible={setPaymentModalVisible} event={selectedEvent} team={selectedTeam} setEvent={fetchMyEvents} isManager={isManager} setTeam={setSelectedTeam}/>}
        </Container>
      )
    } else if(tournament.status === TournamentStatus.SchedulePublished || tournament.status === TournamentStatus.Ongoing || tournament.status === TournamentStatus.Finished){
      return <Container>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5 }}>
          <Avatar sx={{ width: 100, height: 100, m:1 }} src={user?.player.photo}/>
          <Typography variant='h5'>{user?.player.officialName[language]}</Typography>
          <Typography variant='h6'>{tournament.name[language]}</Typography>
        </Box>
        <Divider sx={{ pt:2, pb:2 }}><Typography>แมตช์ต่อไป</Typography></Divider>
        { myNextMatch && <Box >
          {getNextMatchText()}
          <div key={myNextMatch.id} className={`${styles['match-list']} ${styles.matchups}`}>
            <div style={{
              backgroundColor: '#80644f',
              borderTopLeftRadius: '0.25rem',
              borderTopRightRadius: '0.25rem',
              color: 'whitesmoke',
              padding: '0px 10px',
              display: 'flex',
              justifyContent: 'space-between',

            }}>
              <div>{`${myNextMatch.event?.name[language]}  รอบ ${myNextMatch.step === 'group' ? 'แบ่งกลุ่ม' : MAP_ROUND_NAME[myNextMatch.round?.toString() as keyof typeof MAP_ROUND_NAME]}`}</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {myNextMatch.status !== MatchStatus.Waiting && <div>{`#${myNextMatch.matchNumber}`}</div>}
                {myNextMatch.status === MatchStatus.Playing && <div>{`คอร์ด - ${myNextMatch.court}`}</div>}
              </div>
            </div>
            <MatchUp match={myNextMatch} style='list'/>
          </div>
        </Box>}
        <Divider sx={{ pt:2, pb:2 }}><Typography >แมตช์ทั้งหมดของฉัน</Typography></Divider>
        <Box sx={{ height: '290px', overflow: 'scroll' }}>
          {myMatches?.filter((m) => !m.skip).map((match) =>
            <div key={match.id} className={`${styles['match-list']} ${styles.matchups}`}>
              <div style={{
                backgroundColor: '#80644f',
                borderTopLeftRadius: '0.25rem',
                borderTopRightRadius: '0.25rem',
                color: 'whitesmoke',
                padding: '0px 10px',
                display: 'flex',
                justifyContent: 'space-between',

              }}>
                <div>{`${match.event?.name[language]}  รอบ ${match.step === 'group' ? 'แบ่งกลุ่ม' : MAP_ROUND_NAME[match.round?.toString() as keyof typeof MAP_ROUND_NAME]}`}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {match.status !== 'waiting' && <div>{`#${match.matchNumber}`}</div>}
                  {match.status === 'playing' && <div>{`คอร์ด - ${match.court}`}</div>}
                </div>
              </div>
              <MatchUp match={match} style='list'/>
            </div>
          )}
        </Box>
      </Container>
    }
  }

  return (
    <TournamentLayout tournament={tournament}>
      {renderContent()}
      {tournament?.status === TournamentStatus.RegistrationOpen && <FloatingAddButton onClick={handleClickRegister}/>}
      {tournament && <RegisterEventForm
        onFinishRegister={() => fetchMyEvents()}
        tournamentLanguage={tournament.language}
        events={tournament.events}
        visible={registerModalVisible}
        setVisible={setRegisterModalVisible}/>}
      <LoginModal visible={loginModalVisible} setVisible={setLoginModalVisible}/>
    </TournamentLayout>
  )

}
export default Me