'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { useTournament } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Language, MatchStep, TournamentEvent } from '@/type'
import { Box, CircularProgress, Tab, Tabs } from '@mui/material'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import TabPanel from '@/app/components/TabPanel'
import GroupTable from './GroupTable'
import Bracket from './Bracket'

const DrawPage = () => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const [tabIndex, setTabIndex] = useState(0)
  const { tournament } = useTournament(params.id as string)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue)
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
                console.log(event)
                return (
                  <TabPanel value={tabIndex} index={idx} key={event.id} >
                    <GroupTable eventID={event.id}/>
                    <Bracket eventID={event.id} step={MatchStep.PlayOff}/>
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