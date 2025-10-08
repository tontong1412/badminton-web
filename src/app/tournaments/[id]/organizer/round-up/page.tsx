'use client'

import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { useTournament } from '@/app/libs/data'
import { Box, CircularProgress, Tab, Tabs } from '@mui/material'
import { useParams } from 'next/navigation'
import MenuDrawer from '../MenuDrawer'
import { useEffect, useState } from 'react'
import { Language, TournamentEvent, TournamentMenu } from '@/type'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import TabPanel from '@/app/components/TabPanel'
import RoundUpEvent from './RoundUpEvent'
import { useAppDispatch } from '@/app/providers'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'

const RoundUpPage = () => {
  const params = useParams()
  const { tournament } = useTournament(params.id as string)
  const [tabIndex, setTabIndex] = useState(0)
  const dispatch = useAppDispatch()
  const language: Language = useSelector((state: RootState) => state.app.language)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
  }, [dispatch])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue)
  }

  return (
    <TournamentLayout tournament={tournament}>
      {!tournament ? <CircularProgress/> :
        <Box sx={{ display: 'flex' }}>
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
                    <RoundUpEvent eventID={event.id}/>
                  </TabPanel>
                )
              }))}
            </Box>
          </Box>
        </Box>}
    </TournamentLayout>

  )
}
export default RoundUpPage