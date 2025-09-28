'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import {
  Language,
  // Language,
  TournamentEvent,
  TournamentMenu
} from '@/type'
import { Box, CircularProgress, Tab, Tabs } from '@mui/material'
import { useParams } from 'next/navigation'
import {  useEffect, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import ParticipantTable from '../../draw/ParticipantTable'
import MenuDrawer from '../MenuDrawer'
import { useTournament } from '@/app/libs/data'

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  )
}
const Organizer = () => {
  // const { t } = useTranslation()
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [isManager, setIsManager] = useState(false)
  const [tabIndex, setTabIndex] = useState(0)
  const { tournament } = useTournament(params.id as string)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
  }, [dispatch])

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

  return (
    <TournamentLayout tournament={tournament}>
      {!tournament
        ? <CircularProgress/>
        : <Box sx={{ display: 'flex' }}>
          <MenuDrawer tournamentID={tournament.id}/>
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
                    <ParticipantTable eventID={event.id} isManager={isManager} />
                  </TabPanel>
                )
              }))}
            </Box>
          </Box>
        </Box>}
    </TournamentLayout>
  )

}
export default Organizer