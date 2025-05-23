'use client'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch, useSelector } from '@/app/providers'
import { Event, Language, Tournament, TournamentMenu } from '@/type'
import { Box, Container, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ParticipantTable from './ParticipantTable'
import ParticipantMobile from './ParticipantMobile'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  )
}


const ParticipantsPage = () => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const user = useSelector((state: RootState) => state.app.user)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [tournament, setTournament] = useState<Tournament>()
  const [tabIndex, setTabIndex] = useState(0)
  const params = useParams()
  const searchParams = useSearchParams()
  const initialEvent = searchParams.get('event')
  const [isManager, setIsManager] = useState(false)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Participants))
  }, [dispatch])

  useEffect(() => {
    const fetchTournament = async() => {
      try {
        const response = await axios.get(`${SERVICE_ENDPOINT}/tournaments/${params.id}`)
        setTournament(response.data)

        if(initialEvent){
          const eventIndex = response.data?.events.findIndex((e: Event) => e.id === initialEvent)
          setTabIndex(eventIndex || 0)
        }
      } catch (error) {
        console.error('Error fetching tournament:', error)
      }
    }
    fetchTournament()
  }, [])

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
  if (!tournament) return null
  return (
    <TournamentLayout isManager={isManager}>
      <Container maxWidth="xl" sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="basic tabs example"
          >
            {tournament.events.map((event, idx) => (
              <Tab key={idx} label={event.name[language]} />
            ))}
          </Tabs>
        </Box>

        {tournament.events.map(((event, idx) => {
          return (
            <TabPanel value={tabIndex} index={idx} key={event.id} >
              {
                isMobile
                  ? <ParticipantMobile eventID={event.id} isManager={isManager}/>
                  : <ParticipantTable eventID={event.id} isManager={isManager} />
              }

            </TabPanel>
          )
        }))}

      </Container>
    </TournamentLayout>
  )
}
export default ParticipantsPage
