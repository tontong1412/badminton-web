'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import {
  Language,
  SimplePlayer,
  TournamentMenu
} from '@/type'
import { Autocomplete, Avatar, Box, Button, CircularProgress, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemText, TextField, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import {  useEffect, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import MenuDrawer from '../MenuDrawer'
import { usePlayers, useTournament } from '@/app/libs/data'
import { Delete } from '@mui/icons-material'
import { SERVICE_ENDPOINT } from '@/app/constants'
import axios from 'axios'
import MatchListTable from '../../matches/MatchListTable'

const RunMatch = () => {
  // const { t } = useTranslation()
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [isManager, setIsManager] = useState(false)
  const { tournament, mutate: setTournament } = useTournament(params.id as string)
  const { players: playerList } = usePlayers()
  const [selectedUser, setSelectedUser] = useState<SimplePlayer | null>(null)
  const [buttonLoading, setButtonLoading] = useState(false)

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
      {!tournament
        ? <CircularProgress/>
        : <Box sx={{ display: 'flex' }}>
          <MenuDrawer tournamentID={tournament.id}/>
          <Box>
            <MatchListTable tournamentID={tournament.id} isManager={isManager}/>
          </Box>
        </Box>}
    </TournamentLayout>
  )

}
export default RunMatch