'use client'

import { useState, FormEvent, Dispatch, SetStateAction, useEffect, SyntheticEvent } from 'react'
import { GameType, Match, NewTeam, Player } from '@/type'
import {
  TextField,
  Box,
  FormControl,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Divider,
} from '@mui/material'
import { createMatch, fetchPlayers } from '@/app/libs/fetchData'
import AutoCompletePlayerList from './AutoCompletePlayerList'
import Transition from '../ModalTransition'
import moment from 'moment'

interface AddQueueModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  setMatchList: Dispatch<SetStateAction<Match[]>>;
}

const AddQueueModal = ({ visible, setVisible, setMatchList }: AddQueueModalProps) => {
  const [playerList, setPlayerList] = useState<Player[]>([])
  const [player1, setPlayer1] = useState<Player | null>(null)
  const [player2, setPlayer2] = useState<Player | null>(null)
  const [player3, setPlayer3] = useState<Player | null>(null)
  const [player4, setPlayer4] = useState<Player | null>(null)
  const [gameType, setGameType] = useState<GameType>(GameType.Double)

  useEffect(() => {
    const players: Player[] = fetchPlayers()
    setPlayerList(players)
  }, [])

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameType((e.target as HTMLInputElement).value as GameType)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const teamA: NewTeam = { players: [] }
    if(player1)
      teamA.players.push(player1)
    if(player2)
      teamA.players.push(player2)

    const teamB: NewTeam = { players:[] }
    if(player3)
      teamB.players.push(player3)
    if(player4)
      teamB.players.push(player4)

    const matches = createMatch(teamA, teamB)
    setMatchList(matches)

    setPlayer1(null)
    setPlayer2(null)
    setPlayer3(null)
    setPlayer4(null)
    setVisible(false)

  }

  const filterOptions = (chosenPlayers: (Player|null)[]) => {
    const chosenPlayerWithoutNull = chosenPlayers.filter((p) => p !== null)
    const remainPlayers = playerList.filter((player) => !chosenPlayerWithoutNull.some((cPlayer) => cPlayer.id === player.id))
    remainPlayers.sort((a, b) => moment(a.lastMatchEnd).valueOf() - moment(b.lastMatchEnd).valueOf())
    return remainPlayers
  }

  return (
    <Dialog
      data-testid="add-queue-modal"
      open={visible}
      onClose={() => setVisible(false)}
      slots={{ transition: Transition }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ maxWidth: 500, minWidth: 300, mx: 'auto' }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          Add Queue
        </DialogTitle>

        <DialogContent dividers>

          <FormControl>
            <FormLabel>Game type</FormLabel>
            <RadioGroup
              row
              name="gameType"
              onChange={handleRadioChange}
              value={gameType}
            >
              <FormControlLabel value={GameType.Double} control={<Radio />} label="Double" />
              <FormControlLabel value={GameType.Single} control={<Radio />} label="Single" />
            </RadioGroup>
          </FormControl>

          <Divider>Team A</Divider>
          <Autocomplete
            disablePortal
            options={filterOptions([player2, player3, player4])}
            getOptionLabel={(option) => option.displayName || option.officialName}
            renderInput={(params) => <TextField required {...params} fullWidth margin="normal" label="Player 1"/>}
            onChange={(event: SyntheticEvent, newValue: Player | null) => {
              setPlayer1(newValue)
            }}
            renderOption={(props, option) => <AutoCompletePlayerList props={props} option={option}/>}
          />

          {gameType === GameType.Double && <Autocomplete
            disablePortal
            options={filterOptions([player1, player3, player4])}
            getOptionLabel={(option) => option.displayName || option.officialName}
            renderInput={(params) => <TextField required {...params} fullWidth margin="normal"  label="Player 2"/>}
            onChange={(event: SyntheticEvent, newValue: Player | null) => {
              setPlayer2(newValue)
            }}
            renderOption={(props, option) => <AutoCompletePlayerList props={props} option={option}/>}
          />}

          <Divider>Team B</Divider>

          <Autocomplete
            disablePortal
            options={filterOptions([player1, player2, player4])}
            getOptionLabel={(option) => option.displayName || option.officialName}
            renderInput={(params) => <TextField required {...params} fullWidth margin="normal" label="Player 1"/>}
            onChange={(event: SyntheticEvent, newValue: Player | null) => {
              setPlayer3(newValue)
            }}
            renderOption={(props, option) => <AutoCompletePlayerList props={props} option={option}/>}
          />

          {gameType === GameType.Double && <Autocomplete
            disablePortal
            options={filterOptions([player1, player2, player3])}
            getOptionLabel={(option) => option.displayName || option.officialName}
            renderInput={(params) => <TextField required {...params} fullWidth margin="normal" label="Player 2"/>}
            onChange={(event: SyntheticEvent, newValue: Player | null) => {
              setPlayer4(newValue)
            }}
            renderOption={(props, option) => <AutoCompletePlayerList props={props} option={option}/>}
          />}
        </DialogContent>

        <DialogActions>
          <Button variant='outlined' onClick={() => setVisible(false)}>
            Cancel
          </Button>
          <Button type="submit" variant='contained' autoFocus>
            Add
          </Button>
        </DialogActions>
      </Box>

    </Dialog>
  )
}

export default AddQueueModal
