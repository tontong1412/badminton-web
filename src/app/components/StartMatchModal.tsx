'use client'

import { useState, ChangeEvent, FormEvent, Dispatch, SetStateAction } from 'react'
import { Match, MatchStatus } from '@/type'
import {
  TextField,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Checkbox,
  FormControlLabel
} from '@mui/material'
import { updateMatch } from '../libs/fetchData'
import Transition from './ModalTransition'

interface StartMatchModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  match: Match;
  setMatchList: Dispatch<SetStateAction<Match[]>>;
}

interface StartMatchForm {
  court: string;
  addShuttlecock: boolean;
  note: string;
}

const StartMatchModal = ({ visible, setVisible, match, setMatchList }: StartMatchModalProps) => {
  const [formData, setFormData] = useState<StartMatchForm>({
    court:'',
    addShuttlecock: true,
    note: ''
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target
    setFormData((prevState) => ({
      ...prevState,
      [name]: e.target.checked,
    }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const updatedMatch: Match = {
      ...match,
      court: formData.court,
      shuttlecockUsed: formData.addShuttlecock ? 1 : 0,
      note: formData.note,
      status: MatchStatus.Playing,
    }

    const newMatchList: Match[] = updateMatch(updatedMatch)
    setMatchList(newMatchList)

    setVisible(false)
    setFormData({
      court:'',
      addShuttlecock: true,
      note: ''
    })
  }


  return (
    <Dialog
      data-testid="start-match-modal"
      open={visible}
      onClose={() => setVisible(false)}
      slots={{ transition: Transition }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ maxWidth: 400, mx: 'auto' }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          Start Match
        </DialogTitle>

        <DialogContent dividers>
          <TextField
            autoFocus
            label="Court"
            name="court"
            value={formData.court}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <FormControlLabel
            control={<Checkbox
              name={'addShuttlecock'}
              onChange={handleCheckboxChange}
              defaultChecked />}
            label="Add Shuttlecock" />


          <TextField
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

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

export default StartMatchModal
