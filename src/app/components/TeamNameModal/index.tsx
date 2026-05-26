'use client'

import {
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from '@mui/material'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import Transition from '../ModalTransition'
import { useTranslation } from 'react-i18next'
import { Event, EventTeam, Language } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { EventResponse } from '@/app/libs/data'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'

interface TeamNameModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  team: EventTeam;
  setTeam: Dispatch<SetStateAction<EventTeam|null>>;
  event: Event;
  setEvent: EventResponse['mutate'];
}

interface PlayerClub {
  id: string;
  club: string;
}

interface UpdateTeamPayload {
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
}

const TeamNameModal = ({ visible, setVisible, event, team, setEvent, setTeam }: TeamNameModalProps) => {
  const [buttonLoading, setButtonLoading] = useState(false)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { t } = useTranslation()

  const initialClubs = (): PlayerClub[] =>
    team.players.map((p) => ({ id: p.id, club: p.club ?? '' }))

  const [playerClubs, setPlayerClubs] = useState<PlayerClub[]>(initialClubs)

  const handleClubChange = (playerID: string, value: string) => {
    setPlayerClubs((prev) => prev.map((pc) => pc.id === playerID ? { ...pc, club: value } : pc))
  }

  const handleClose = () => {
    setVisible(false)
    setPlayerClubs(initialClubs())
  }

  const updateTeam = async() => {
    setButtonLoading(true)
    const payload: UpdateTeamPayload = {
      eventID: event.id,
      teamID: team.id,
      field: 'teamName',
      value: playerClubs
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-team`, payload, { withCredentials: true })
    setEvent(response.data)
    const updatedTeam = response.data.teams.find((t: EventTeam) => t.id === team.id)
    setTeam(updatedTeam)
    setButtonLoading(false)
    setVisible(false)
  }

  useEffect(() => {
    setPlayerClubs(initialClubs())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team])

  return (
    <Dialog
      fullWidth
      open={visible}
      onClose={handleClose}
      slots={{ transition: Transition }}
    >
      <Box>
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {t('tournament.action.teamName')}
        </DialogTitle>
        <DialogContent dividers>
          {team.players.map((player, idx) => (
            <Box key={player.id} sx={{ mb: 2 }}>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5 }}>
                {player.officialName[language] || player.officialName.th || player.officialName.en || ''}
              </Typography>
              <TextField
                autoFocus={idx === 0}
                value={playerClubs.find((pc) => pc.id === player.id)?.club ?? ''}
                label={t('tournament.action.teamName')}
                onChange={(e) => handleClubChange(player.id, e.target.value)}
                fullWidth
                size='small'
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={handleClose}>
            {t('action.close')}
          </Button>
          <Button variant='contained' onClick={updateTeam} loading={buttonLoading}>
            {t('action.save')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default TeamNameModal
