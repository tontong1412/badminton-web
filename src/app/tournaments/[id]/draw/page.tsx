'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { useTournament } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Language, MatchStep, TournamentEvent, TournamentMenu, TournamentStatus } from '@/type'
import { Box, CircularProgress, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import TabPanel from '@/app/components/TabPanel'
import GroupTable from './GroupTable'
import Bracket from './Bracket'
import theme from '@/theme'
import ParticipantMobile from './ParticipantMobile'
import ParticipantTable from './ParticipantTable'
import FloatingAddButton from '@/app/components/FloatingAddButton'
import RegisterEventForm from '@/app/components/RegisterEventModal'
import LoginModal from '@/app/components/LoginModal'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { useAppDispatch } from '@/app/providers'
import { Block } from '@mui/icons-material'

const DrawPage = () => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [tabIndex, setTabIndex] = useState(0)
  const { tournament } = useTournament(params.id as string)
  const [content, setContent] = useState<MatchStep | 'list'>(MatchStep.Group)
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [isManager, setIsManager] = useState(false)
  const user = useSelector((state: RootState) => state.app.user)
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const [registerModalVisible, setRegisterModalVisible] = useState(false)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Participants))
  }, [dispatch])

  useEffect(() => {
    if(tournament){
      if(tournament.status === TournamentStatus.RegistrationOpen || tournament.status === TournamentStatus.RegistrationClose || tournament.status === TournamentStatus.Preparation){
        setContent('list')
      }else{
        setContent(MatchStep.Group)
      }
    }
  }, [tournament])

  useEffect(() => {
    if(user && tournament && tournament.managers?.map((m) => m.id)?.includes(user?.player.id)){
      setIsManager(true)
    }else{
      setIsManager(false)
    }
  }, [user, tournament])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue)
  }

  const handleContent = (
    event: React.MouseEvent<HTMLElement>,
    newContent: MatchStep,
  ) => {
    if(newContent !== null){
      setContent(newContent)
    }
  }

  const handleClickRegister = () => {
    if(!user){
      setLoginModalVisible(true)
    }else{
      setRegisterModalVisible(true)
    }
  }

  const renderContent = (eventID: string) => {
    const canPublishDraw = tournament.status === TournamentStatus.SchedulePublished || tournament.status === TournamentStatus.Ongoing || tournament.status === TournamentStatus.Finished
    if(content === MatchStep.Group && (canPublishDraw || isManager)){
      return <GroupTable eventID={eventID} />
    }else if(content === MatchStep.PlayOff && (canPublishDraw || isManager)){
      return <Bracket eventID={eventID} step={MatchStep.PlayOff}/>
    } else if (content === 'list'){
      return (
        <>
          {
            isMobile
              ? <ParticipantMobile eventID={eventID} isManager={isManager} />
              : <ParticipantTable eventID={eventID} isManager={isManager} />
          }
          {tournament.status === TournamentStatus.RegistrationOpen && <FloatingAddButton onClick={handleClickRegister}/>}
          <RegisterEventForm
            onFinishRegister={() => router.push(`/tournaments/${tournament.id}/me`)}
            tournamentLanguage={tournament.language}
            events={tournament.events}
            visible={registerModalVisible}
            setVisible={setRegisterModalVisible}/>
          <LoginModal visible={loginModalVisible} setVisible={setLoginModalVisible}/>
        </>
      )
    }else {
      return <Box sx={{ color: 'GrayText', display: 'flex', flexDirection:'column', alignItems: 'center', mt:5 }} >
        <Block sx={{ fontSize: 100 }}/>
        <Typography variant='h6' align='center'>Draw is not yet published</Typography>
      </Box>
    }
  }

  return (
    <TournamentLayout tournament={tournament}>
      {!tournament
        ? <CircularProgress/>
        : <Box sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%' }}>
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="basic tabs example"
            >
              {tournament.events.map((e: TournamentEvent, idx) => (
                <Tab key={idx} label={e.name[language]} />
              ))}
            </Tabs>
            <Box component="main" sx={{ flexGrow: 1, p: 2, pt:0 }}>
              {tournament.events.map(((event, idx) => {
                return (
                  <TabPanel value={tabIndex} index={idx} key={event.id} >
                    <ToggleButtonGroup
                      value={content}
                      exclusive
                      onChange={handleContent}
                      color='primary'
                    >
                      <ToggleButton value="list" aria-label="left aligned">
                        <Typography>List</Typography>
                      </ToggleButton>
                      <ToggleButton value="group" aria-label="left aligned">
                        <Typography>Group</Typography>
                      </ToggleButton>
                      <ToggleButton value="playoff" aria-label="centered">
                        Play off
                      </ToggleButton>
                    </ToggleButtonGroup>
                    {renderContent(event.id)}
                  </TabPanel>
                )
              }))}
            </Box>
          </Box>
        </Box>}
    </TournamentLayout>
  )
}
export default DrawPage