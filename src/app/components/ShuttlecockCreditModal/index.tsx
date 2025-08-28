'use client'

import {
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
} from '@mui/material'
import { RootState } from '@/app/libs/redux/store'
import { Dispatch, FormEvent, ReactNode, SetStateAction, useState } from 'react'
import Transition from '../ModalTransition'
import { useTranslation } from 'react-i18next'
import { Event, EventTeam, Language } from '@/type'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {  SERVICE_ENDPOINT } from '@/app/constants'

interface ShuttlecockCreditModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  team: EventTeam;
  setTeam: Dispatch<SetStateAction<EventTeam|null>>;
  event: Event;
  setEvent: Dispatch<SetStateAction<Event|undefined>> | ((event: Event)=>void);
  isManager: boolean;
}

interface UpdateShuttlecockCreditPayload {
  eventID: string;
  teamID: string;
  action: string;
  amount: string;
}

const Detail = ({ title, content }: {title: string; content: string | ReactNode}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Box sx={{ fontWeight: 'bold', width: '100px' }}>{title}:</Box>
      <Box>{content}</Box>
    </Box>
  )

}


const ShuttlecockCreditModal = ({ visible, setVisible, event, team, setEvent, setTeam }: ShuttlecockCreditModalProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [action, setAction] = useState('increment')
  const [amount, setAmount] = useState('10')
  const [buttonLoading, setButtonLoading] = useState(false)
  const { t } = useTranslation()

  const updateShuttlecockCredit = async(teamID: string, action: string, amount: string) => {
    const payload : UpdateShuttlecockCreditPayload = {
      eventID: event.id,
      teamID,
      action,
      amount
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-shuttlecock`, payload, { withCredentials: true })
    setEvent(response.data)
    const updatedTeam = response.data.teams.find((t: EventTeam) => t.id === team.id)
    setTeam(updatedTeam)
    setButtonLoading(false)
    onCloseModal()
  }

  const onCloseModal = () => {
    setAction('increment')
    setAmount('10')
    setVisible(false)
  }

  const handleSubmit = (e:FormEvent) => {
    e.preventDefault()
    setButtonLoading(true)
    updateShuttlecockCredit(team.id, action, amount)
  }


  return (
    <Dialog
      fullWidth
      data-testid="shuttlecock-modal"
      open={visible}
      onClose={onCloseModal}
      slots={{ transition: Transition }}
    >

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ maxWidth: 400, mx: 'auto' }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="contact-person-dialog-title">
          {t('tournament.registration.shuttlecockCredit')}
        </DialogTitle>

        <DialogContent dividers sx={{ maxHeight:'600px' }}>
          <Detail title='รายการ' content={event.name[language] || '-'}/>
          {
            team.players.map((p, idx) => (
              <Detail key={p.id} title={`ผู้เล่น ${idx + 1}`} content={p.officialName[language] || ''}/>
            ))
          }
          <Detail title='คูปองคงเหลือ' content={`${team.shuttlecockCredit}`} />

          <Divider sx={{ pt: 2, pb: 2 }}>รายการ</Divider>
          <FormControl>
            {/* <FormLabel id="shuttlecock-action">เติม-คืน ลูกแบด</FormLabel> */}
            <RadioGroup
              aria-labelledby="shuttlecock-action"
              defaultValue="increment"
              name="action"
              value={action}
              onChange={(e, value) => setAction(value)}
            >
              <FormControlLabel value="increment" control={<Radio />} label="เติม" />
              <FormControlLabel value="decrement" control={<Radio />} label="คืน" />
            </RadioGroup>
          </FormControl>

          <TextField
            label={'จำนวน'}
            fullWidth
            margin="normal"
            type='number'
            name='amount'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={onCloseModal}>
            {t('action.cancel')}
          </Button>
          <Button variant='contained' type='submit' loading={buttonLoading}>
            {t('action.confirm')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
export default ShuttlecockCreditModal
