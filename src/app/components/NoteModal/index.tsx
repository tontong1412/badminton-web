'use client'

import {
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import Transition from '../ModalTransition'
import { useTranslation } from 'react-i18next'
import { Event, EventTeam,  PaymentStatus } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '@/app/constants'

interface NoteModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  team: EventTeam;
  setTeam: Dispatch<SetStateAction<EventTeam|null>>;
  event: Event;
  setEvent: Dispatch<SetStateAction<Event|undefined>> | ((event: Event)=>void);
  isManager: boolean;
}

interface UpdateTeamPayload {
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
  paymentStatus?: PaymentStatus;
}


const NoteModal = ({ visible, setVisible, event, team, setEvent, setTeam }: NoteModalProps) => {
  const [buttonLoading, setButtonLoading] = useState(false)
  const [note, setNote] = useState(team.note)
  const { t } = useTranslation()

  const updateTeam = async(teamID: string, field: string, value: unknown) => {
    setButtonLoading(true)
    const payload : UpdateTeamPayload = {
      eventID: event.id,
      teamID,
      field,
      value
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-team`, payload, { withCredentials: true })
    setEvent(response.data)
    const updatedTeam = response.data.teams.find((t: EventTeam) => t.id === team.id)
    setTeam(updatedTeam)
    setButtonLoading(false)
    setVisible(false)
  }

  useEffect(() => {
    setNote(team.note)
  }, [team])

  return (
    <Dialog
      data-testid="note-modal"
      open={visible}
      onClose={() => {
        setVisible(false)
        setNote('')
      }}
      slots={{ transition: Transition }}
    >

      <Box
        sx={{ minWidth: 350, mx: 'auto' }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="contact-person-dialog-title">
          {t('tournament.registration.note')}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            value={note}
            label={t('tournament.registration.note')}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            margin="normal"
            multiline
          />

        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => {
            setVisible(false)
            setNote('')
          }}>
            {t('action.close')}
          </Button>
          <Button variant='contained' onClick={() => updateTeam(team.id, 'note', note)} loading={buttonLoading}>
            {t('action.save')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
export default NoteModal
