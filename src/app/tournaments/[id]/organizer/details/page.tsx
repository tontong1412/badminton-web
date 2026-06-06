'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import {
  TournamentMenu
} from '@/type'
import { Box, CircularProgress } from '@mui/material'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import MenuDrawer from '../MenuDrawer'
import { useTournament } from '@/app/libs/data'
import TournamentDetails from './TournamentDetails'

const TournamentDetailsPage = () => {
  const user = useSelector((state: RootState) => state.app.user)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [isManager, setIsManager] = useState(false)
  const { tournament, mutate: setTournament } = useTournament(params.id as string)

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

  return (
    <TournamentLayout tournament={tournament}>
      { !tournament ? <CircularProgress/>
        :
        <Box sx={{ display: 'flex' }}>
          <MenuDrawer tournamentID={tournament.id}/>
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <TournamentDetails tournament={tournament} isManager={isManager} setTournament={setTournament}/>
          </Box>
        </Box>}
    </TournamentLayout>
  )
}
export default TournamentDetailsPage
