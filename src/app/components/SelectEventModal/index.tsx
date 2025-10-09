'use client'

import {
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Dispatch, SetStateAction, useState } from 'react'
import Transition from '../ModalTransition'
import { useTranslation } from 'react-i18next'
import { Event, EventTeam,  Language } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { EventResponse, useTournament } from '@/app/libs/data'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'

interface SelectEventModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  team: EventTeam;
  setTeam: Dispatch<SetStateAction<EventTeam|null>>;
  event: Event;
  setEvent: EventResponse['mutate'];
  isManager: boolean;
}

interface ChangeEventPayload {
  eventID: string;
  teamID: string;
  changeToID: string;
}


const SelectEventModal = ({ visible, setVisible, event, team, setEvent, setTeam }: SelectEventModalProps) => {
  const [buttonLoading, setButtonLoading] = useState(false)
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const { tournament } = useTournament(event.tournament.id)
  console.log(event.id)

  const onChangeEvent = async() => {
    if(!selectedEvent) return
    setButtonLoading(true)
    const payload : ChangeEventPayload = {
      eventID: event.id,
      teamID: team.id,
      changeToID: selectedEvent
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/change-event`, payload, { withCredentials: true })
    setEvent(response.data)
    const updatedTeam = response.data.teams.find((t: EventTeam) => t.id === team.id)
    setTeam(updatedTeam)
    setButtonLoading(false)
    setVisible(false)
  }

  return (
    <Dialog
      fullWidth
      data-testid="note-modal"
      open={visible}
      onClose={() => {
        setVisible(false)
      }}
      slots={{ transition: Transition }}
    >

      <Box>
        <DialogTitle sx={{ m: 0, p: 2 }} id="contact-person-dialog-title">
          {t('tournament.registration.note')}
        </DialogTitle>
        <DialogContent dividers>
          <FormControl fullWidth margin="normal">
            <InputLabel id="event-label">{t('tournament.registration.event')}</InputLabel>
            <Select
              required
              label="Event"
              labelId="event-label"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}>
              {tournament?.events.filter((e) => e.id !== event.id).map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.name[language] || e.name.en}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => {
            setVisible(false)
          }}>
            {t('action.close')}
          </Button>
          <Button variant='contained' onClick={() => onChangeEvent()} loading={buttonLoading}>
            {t('action.save')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
export default SelectEventModal
