'use client'

import { useState, ChangeEvent, FormEvent, Dispatch, SetStateAction, useEffect } from 'react'
import {  EventFormat, EventStatus, EventType, Tournament, TournamentEvent } from '@/type'
import {
  TextField,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import Transition from './ModalTransition'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'
import { TournamentResponse } from '../libs/data'

interface EventModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  event?: TournamentEvent;
  setTournament: TournamentResponse['mutate']
  setEvent: Dispatch<SetStateAction<TournamentEvent|undefined>>;
  isCreating: boolean;
  tournament: Tournament;
}

interface EventForm {
  id: string | undefined;
  nameTH: string;
  nameEN: string;
  description: string;
  fee: number;
  prize?: string;
  type: EventType;
  format: EventFormat;
  limit?: number;
}

const defaultFormData = {
  id: '',
  nameTH:'',
  nameEN: '',
  description:'',
  fee:1000,
  prize:'',
  type: EventType.Double,
  format:  EventFormat.Group,
  limit: 32
}

const EventModal = ({ visible, setVisible, event, isCreating, tournament, setTournament, setEvent }: EventModalProps) => {
  const [formData, setFormData] = useState<EventForm>({
    id: event?.id,
    nameTH: event?.name?.th ?? '',
    nameEN: event?.name?.en ?? '',
    description: event?.description ?? '',
    fee: event?.fee.amount ?? 1000,
    prize: event?.prize ?? '',
    type: event?.type ?? EventType.Double,
    format: event?.format ?? EventFormat.Group,
    limit: event?.limit ?? 32
  })

  useEffect(() => {
    if(event){
      setFormData({
        id: event?.id,
        nameTH: event?.name?.th,
        nameEN: event?.name?.en,
        description: event?.description,
        fee: event?.fee.amount,
        prize: event?.prize,
        type: event?.type,
        format: event?.format,
        limit: event?.limit
      })
    }
  }, [event])

  const closeModal = () => {
    setVisible(false)
    setFormData(defaultFormData)
    setEvent(undefined)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }))
  }



  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name } = e.target
    setFormData((prevState) => ({
      ...prevState,
      [name]: e.target.value,
    }))
  }

  const handleSubmit = async(e: FormEvent) => {
    e.preventDefault()
    const newEvent = {
      tournament:{
        id: tournament.id
      },
      name:{
        en: formData.nameEN,
        th: formData.nameTH
      },
      description: formData.description,
      fee:{
        amount: formData.fee,
        currency: 'thb'
      },
      prize: formData.prize,
      type: formData.type,
      format: formData.format,
      limit: formData.limit,
      status: formData.format === EventFormat.SingleElimination ? EventStatus.Playoff : EventStatus.Group
    }
    if(isCreating){
      await axios.post(`${SERVICE_ENDPOINT}/events`, newEvent, { withCredentials: true })
    }else{
      await axios.put(`${SERVICE_ENDPOINT}/events/${event?.id}`, newEvent, { withCredentials: true })
    }

    setTournament()
    closeModal()
  }


  return (
    <Dialog
      fullWidth
      data-testid="start-match-modal"
      open={visible}
      onClose={closeModal}
      slots={{ transition: Transition }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          {isCreating ? 'Create Event Detail' : 'Update Event Detail'}
        </DialogTitle>

        <DialogContent dividers sx={{ maxHeight:'550px' }}>
          <TextField
            autoFocus
            label="ชื่อรายการภาษาไทย"
            name="nameTH"
            value={formData.nameTH}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            autoFocus
            label="ชื่อรายการภาษาอังกฤษ"
            name="nameEN"
            value={formData.nameEN}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="format-select-label">ประเภท</InputLabel>
            <Select
              labelId="format-select-label-id"
              id="format-select"
              value={formData.type}
              name='type'
              label="ประเภท"
              onChange={handleSelectChange}
            >
              {Object.values(EventType).map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>


          <TextField
            label="รายละเอียด"
            name="description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <TextField
            label="จำกันจำนวน"
            name="limit"
            type='number'
            value={formData.limit}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <TextField
            label="ค่าสมัคร"
            name="fee"
            type='number'
            value={formData.fee}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <TextField
            label="รางวัล"
            name="prize"
            value={formData.prize}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="format-select-label">รูปแบบการแข่งขัน</InputLabel>
            <Select
              labelId="format-select-label-id"
              id="format-select"
              value={formData.format}
              name='format'
              label="รูปแบบการแข่งขัน"
              onChange={handleSelectChange}
            >
              {Object.values(EventFormat).map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>

        </DialogContent>

        <DialogActions>
          <Button variant='outlined' onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" variant='contained' autoFocus>
            {isCreating ? 'Add' : 'Confirm'}
          </Button>
        </DialogActions>
      </Box>

    </Dialog>

  )
}

export default EventModal
