'use client'

import { useState, ChangeEvent, FormEvent, Dispatch, SetStateAction, forwardRef } from 'react'
import { NewPlayer, PaymentStatus, Player } from '@/type'
import { v1 as uuid } from 'uuid'
import moment from 'moment'
import {
  TextField,
  Box,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Slide,
} from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { TransitionProps } from '@mui/material/transitions'
import { updatePlayers } from '@/app/libs/fetchData'

interface AddPlayerModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  players: Player[];
  setPlayers: Dispatch<SetStateAction<Player[]>>;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

const AddPlayerModal = ({ visible, setVisible, players, setPlayers }: AddPlayerModalProps) => {
  const [formData, setFormData] = useState<NewPlayer>({
    officialName: '',
    displayName: '',
    level: 0,
    lastMatchEnd: '',
    paymentStatus: PaymentStatus.Unpaid
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }))
  }

  const handleSelectChange = (e: SelectChangeEvent) => {
    setFormData((prevState) => ({
      ...prevState,
      level: parseInt(e.target.value, 10), // Parse level as number
    }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const newPlayer: Player = {
      ...formData,
      lastMatchEnd: moment().toISOString(),
      id: uuid(),
      paymentStatus: PaymentStatus.Unpaid
    }
    const playerList = [...players]
    playerList.push(newPlayer)
    setPlayers(playerList)
    updatePlayers(playerList)
    setVisible(false)
    setFormData({
      officialName: '',
      displayName: '',
      level: 0,
      lastMatchEnd: '',
      paymentStatus: PaymentStatus.Unpaid,
    })
  }


  return (
    <Dialog
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
          Add Player
        </DialogTitle>

        <DialogContent dividers>
          <TextField
            autoFocus
            required
            label="Official Name"
            name="officialName"
            value={formData.officialName}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <TextField
            label="Nick Name"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="level-label">Level</InputLabel>
            <Select
              required
              labelId="level-label"
              value={formData.level.toString()}
              onChange={handleSelectChange}
              label="Level"
            >
              <MenuItem value={0}>Casual</MenuItem>
              <MenuItem value={1}>Beginner</MenuItem>
              <MenuItem value={2}>Intermediate</MenuItem>
              <MenuItem value={3}>Advanced</MenuItem>
              <MenuItem value={4}>Professional</MenuItem>
            </Select>
          </FormControl>
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

export default AddPlayerModal
