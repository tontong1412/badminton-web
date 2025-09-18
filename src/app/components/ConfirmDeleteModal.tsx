import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import Transition from './ModalTransition'
import { SERVICE_ENDPOINT } from '../constants'
import axios from 'axios'
import { Dispatch, SetStateAction } from 'react'
import { TournamentEvent } from '@/type'
import { TournamentResponse } from '../libs/data'

interface ConfirmDeleteModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  event?: TournamentEvent;
  setTournament: TournamentResponse['mutate']
}

const ConfirmDeleteModal = ({ visible, setVisible, event, setTournament }:ConfirmDeleteModalProps) => {
  const handleDeleteEvent = async() => {
    await axios.delete(`${SERVICE_ENDPOINT}/events/${event?.id}`, { withCredentials: true })

    setTournament()
    setVisible(false)
  }
  return (
    <Dialog
      open={visible}
      slots={{
        transition: Transition,
      }}
      keepMounted
      onClose={() => setVisible(false)}
      aria-describedby="alert-dialog-slide-description"
    >
      <DialogTitle>{'คุณแน่ใจที่จะลบรายการแข่งนี้หรือไม่?'}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-slide-description">
          หากลบออกแล้ว รายชื่อผู้สมัคร และข้อมูลต่างๆจะถูกลบออกไปด้วย กรุณายืนยัน
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color='error' onClick={handleDeleteEvent}>Confirm</Button>
        <Button onClick={() => setVisible(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
export default ConfirmDeleteModal