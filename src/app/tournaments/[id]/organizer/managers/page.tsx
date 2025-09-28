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

const Manager = () => {
  // const { t } = useTranslation()
  // const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  // const [isManager, setIsManager] = useState(false)
  const { tournament, mutate: setTournament } = useTournament(params.id as string)
  const { players: playerList } = usePlayers()
  const [selectedUser, setSelectedUser] = useState<SimplePlayer | null>(null)
  const [buttonLoading, setButtonLoading] = useState(false)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
  }, [dispatch])

  // useEffect(() => {
  //   if(user && tournament && tournament.managers?.map((m) => m.id)?.includes(user?.player.id)){
  //     setIsManager(true)
  //   }else{
  //     setIsManager(false)
  //   }
  // }, [user, tournament])

  const handleAddManager = async() => {
    setButtonLoading(true)
    const response = await axios.post(`${SERVICE_ENDPOINT}/tournaments/add-manager`, {
      playerID: selectedUser?.id,
      tournamentID: tournament.id
    }, { withCredentials:true })
    setButtonLoading(false)
    setTournament(response.data)
    setSelectedUser(null)
  }

  const handleRemoveManager = async(manager: SimplePlayer) => {
    setButtonLoading(true)
    const response = await axios.post(`${SERVICE_ENDPOINT}/tournaments/remove-manager`, {
      playerID: manager.id,
      tournamentID: tournament.id
    }, { withCredentials:true })
    setButtonLoading(false)
    setTournament(response.data)
  }


  return (
    <TournamentLayout tournament={tournament}>
      {!tournament
        ? <CircularProgress/>
        : <Box sx={{ display: 'flex' }}>
          <MenuDrawer tournamentID={tournament.id}/>
          <Box sx={{ width: '100%', maxWidth: 400, m:5 }}>
            <Typography variant='h5'>Manager</Typography>
            <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
              <ListItem
                secondaryAction={
                  <Button disabled={selectedUser === null} loading={buttonLoading} variant='contained' onClick={handleAddManager}>Add</Button>
                }>
                <Autocomplete
                  disablePortal
                  autoHighlight
                  options={playerList?.filter((p) => !tournament.managers.map((m) => m.id).includes(p.id))}
                  sx={{ width: 250 }}
                  renderInput={(params) => <TextField {...params} label="Add new manager" />}
                  getOptionLabel={(option) => {
                    return option.officialName[language] || option.officialName['th'] || ''
                  }}
                  renderOption={(props, option) => {
                    // eslint-disable-next-line react/prop-types, @typescript-eslint/no-unused-vars
                    const { key, ...optionProps } = props
                    return (
                      <li key={option.id} {...optionProps}>
                        <span>{option.officialName[language] || option.officialName['th'] || ''}</span>
                        {option.displayName?.[language] && <span>{` (${option.displayName?.[language]})`}</span>}
                      </li>
                    )
                  }}
                  onChange={(event, newValue) => {setSelectedUser(newValue)}}
                />
              </ListItem>
              <Divider  component="li" />
              {
                tournament.managers.map((m) => <Box key={m.id}>
                  <ListItem
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveManager(m)}>
                        <Delete />
                      </IconButton>
                    }>
                    <ListItemAvatar>
                      <Avatar src={m.photo}/>
                    </ListItemAvatar>
                    <ListItemText primary={m.officialName[language]} secondary={m.displayName?.[language]} />
                  </ListItem>
                  <Divider  component="li" />
                </Box>)
              }
            </List>
          </Box>
        </Box>}
    </TournamentLayout>
  )

}
export default Manager