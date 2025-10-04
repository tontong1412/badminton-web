'use client'

import Transition from '@/app/components/ModalTransition'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { MatchResponse } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Language, Match } from '@/type'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import axios from 'axios'
import { Dispatch, FormEvent, SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

interface SettingMatchDialogProps{
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  match: Match;
  setMatch: MatchResponse['mutate']
}

const SettingMatchDialog = ({ visible, setVisible, match, setMatch }: SettingMatchDialogProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [server, setServer] = useState('')
  const [receiver, setReceiver] = useState('')
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async(e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const [serverTeam, serverIndex] = server.split('-')
    const [receiverTeam, receiverIndex] = receiver.split('-')


    const payload = {
      [`team${serverTeam}.isServing`]: true,
      [`team${serverTeam}.serving`]: serverIndex,
      [`team${serverTeam}.receiving`]: serverIndex,
      [`team${receiverTeam}.receiving`]: receiverIndex,
      [`team${receiverTeam}.serving`]: receiverIndex,
      [`team${receiverTeam}.isServing`]: false,
    }
    const response = await axios.put(`${SERVICE_ENDPOINT}/matches/${match.id}`, payload, { withCredentials:true })
    setVisible(false)
    setMatch(response.data)
    setLoading(false)
  }
  return (
    <Dialog
      fullWidth
      data-testid="register-event-modal"
      open={visible}
      // onClose={handleCloseModal}
      slots={{ transition: Transition }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
      >

        <DialogTitle sx={{ m: 0, p: 2 }}>
          {'เลือกคนรับ/เสิร์ฟ'}
        </DialogTitle>
        <DialogContent dividers>
          <FormControl fullWidth margin="normal">
            <InputLabel id="event-label">{'คนเสิร์ฟ'}</InputLabel>
            <Select
              required
              label="Event"
              labelId="event-label"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            >
              {match.teamA.players.map((player, i) => (
                <MenuItem key={player.id} value={`A-${i}`}>
                  {player.officialName[language]}
                </MenuItem>
              ))}
              {match.teamB.players.map((player, i) => (
                <MenuItem key={player.id} value={`B-${i}`}>
                  {player.officialName[language]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="event-label">{'คนรับ'}</InputLabel>
            <Select
              required
              label="Event"
              labelId="event-label"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
            >
              {match.teamA.players.map((player, i) => (
                <MenuItem key={player.id} value={`A-${i}`}>
                  {player.officialName[language]}
                </MenuItem>
              ))}
              {match.teamB.players.map((player, i) => (
                <MenuItem key={player.id} value={`B-${i}`}>
                  {player.officialName[language]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setVisible(false)}>
            {t('action.cancel')}
          </Button>
          <Button type="submit" variant="contained" loading={loading} disabled={loading}>
            {t('tournament.registration.registerConfirm')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
export default SettingMatchDialog