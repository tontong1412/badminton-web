'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import {  SERVICE_ENDPOINT } from '@/app/constants'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import {
  Language,
  Player,
  // Language,
  Tournament,
  TournamentEvent,
  TournamentMenu
} from '@/type'
import { Box, CircularProgress, Tab, Tabs } from '@mui/material'
import axios from 'axios'
import { useParams } from 'next/navigation'
import {   useEffect, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import MenuDrawer from '../MenuDrawer'
import PlayerPopover from '../../participants/PlayerPopover'
import GroupDraw from './GroupDraw'

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  )
}
const Organizer = () => {
  // const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [tournament, setTournament] = useState<Tournament>()
  const [tabIndex, setTabIndex] = useState(0)
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
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
  }, [])

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
                    <GroupDraw eventID={event.id}/>
                  </TabPanel>
                )
              }))}
            </Box>
          </Box>
        </Box>}
      {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
    </TournamentLayout>
  )

}
export default Organizer