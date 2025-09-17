'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import {  SERVICE_ENDPOINT } from '@/app/constants'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import {
  // Language,
  Tournament,
  TournamentMenu
} from '@/type'
import { Box } from '@mui/material'
import axios from 'axios'
import { useParams } from 'next/navigation'
import {  useEffect, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import EventManagement from './EventManagement'
import MenuDrawer from '../MenuDrawer'
const Organizer = () => {
  // const { t } = useTranslation()
  const user = useSelector((state: RootState) => state.app.user)
  // const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [tournament, setTournament] = useState<Tournament>()
  const [isManager, setIsManager] = useState(false)

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


  useEffect(() => {
    if(user && tournament && tournament.managers?.map((m) => m.id)?.includes(user?.player.id)){
      setIsManager(true)
    }else{
      setIsManager(false)
    }
  }, [user, tournament])

  if(!tournament) return

  return (
    <TournamentLayout isManager={isManager}>
      <Box sx={{ display: 'flex' }}>
        <MenuDrawer tournamentID={tournament.id}/>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <EventManagement tournament={tournament} isManager={isManager} setTournament={setTournament}/>
        </Box>
      </Box>
    </TournamentLayout>
  )

}
export default Organizer