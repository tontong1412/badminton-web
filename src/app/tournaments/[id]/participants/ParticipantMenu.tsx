import ContactPersonModal from '@/app/components/ContactPersonModal'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { Event, EventTeam, Language, TeamStatus } from '@/type'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Menu, MenuItem, Typography } from '@mui/material'
import axios from 'axios'
import { Dispatch, SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PaymentModal from '@/app/components/PaymentModal'
import NoteModal from '@/app/components/NoteModal'
import ShuttlecockCreditModal from '@/app/components/ShuttlecockCreditModal'
import Transition from '@/app/components/ModalTransition'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'

interface ParticipantMenuProps {
  menuTeam: EventTeam
  setMenuTeam: Dispatch<SetStateAction<EventTeam | null>>
  anchorElMenu: null | HTMLElement
  event: Event
  setEvent: Dispatch<SetStateAction<Event|undefined>>
  setAnchorElMenu: Dispatch<SetStateAction<HTMLElement | null>>
  isManager: boolean
}

interface UpdateTeamPayload {
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
}
const ParticipantMenu = ({ menuTeam, setMenuTeam, anchorElMenu, event, setEvent, setAnchorElMenu, isManager }:ParticipantMenuProps) => {
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [contactPersonModalVisible, setContactPersonModalVisible] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [confirmWithdrawDialogVisible, setConfirmWithdrawDialogVisible] = useState(false)
  const [shuttlecockDialogVisible, setShuttlecockDialogVisible] = useState(false)
  const [withdrawButtonLoading, setWithdrawButtonLoading] = useState(false)


  const withdrawTeam = async(teamID: string) => {
    setWithdrawButtonLoading(true)
    const payload: {teamID: string, eventID: string} = {
      teamID,
      eventID: event.id
    }

    const response = await axios.post(`${SERVICE_ENDPOINT}/events/withdraw`, payload, { withCredentials:true })
    setEvent(response.data)
    setConfirmWithdrawDialogVisible(false)
    setWithdrawButtonLoading(false)
  }

  const updateTeam = async(teamID: string, field: string, value: unknown) => {
    const payload : UpdateTeamPayload = {
      eventID: event.id,
      teamID,
      field,
      value
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-team`, payload, { withCredentials: true })
    setEvent(response.data)
  }

  const handleCloseMenu = () => {
    setAnchorElMenu(null)
    setMenuTeam(null)
  }


  return (
    <>
      <Menu
        id="admin-menu"
        anchorEl={anchorElMenu}
        open={Boolean(anchorElMenu)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          setContactPersonModalVisible(true)
          setAnchorElMenu(null)
        }}>{t('tournament.action.contactPerson')}
        </MenuItem>

        {(menuTeam && menuTeam.status !== TeamStatus.Idle) && <MenuItem onClick={async() => {
          if(menuTeam){
            await updateTeam(menuTeam.id, 'status', TeamStatus.Idle)
          }
          handleCloseMenu()
        }}>{t('tournament.action.changeStatus')}</MenuItem>}

        <MenuItem onClick={() => {
          setPaymentModalVisible(true)
          setAnchorElMenu(null)
        }}>{t('tournament.action.paymentSlip')}</MenuItem>

        <MenuItem onClick={() => {
          setNoteModalVisible(true)
          setAnchorElMenu(null)
        }}>{t('tournament.action.note')}</MenuItem>

        <MenuItem onClick={() => {
          setShuttlecockDialogVisible(true)
          setAnchorElMenu(null)
        }}>{t('tournament.action.shuttlecock')}</MenuItem>

        {menuTeam && <MenuItem onClick={() => {
          setConfirmWithdrawDialogVisible(true)
          setAnchorElMenu(null)
        }}>{t('tournament.action.withdraw')}</MenuItem>}
      </Menu>
      <PaymentModal visible={paymentModalVisible} setVisible={setPaymentModalVisible} event={event} team={menuTeam} setEvent={setEvent} isManager={isManager} setTeam={setMenuTeam}/>
      <NoteModal visible={noteModalVisible} setVisible={setNoteModalVisible} event={event} team={menuTeam} setEvent={setEvent} setTeam={setMenuTeam} isManager={isManager}/>
      <ShuttlecockCreditModal visible={shuttlecockDialogVisible} setVisible={setShuttlecockDialogVisible} event={event} team={menuTeam} setEvent={setEvent} setTeam={setMenuTeam} isManager={isManager}/>
      {menuTeam.contactPerson && <ContactPersonModal visible={contactPersonModalVisible} setVisible={setContactPersonModalVisible} player={menuTeam.contactPerson}/>}
      <Dialog
        open={confirmWithdrawDialogVisible}
        onClose={() => setConfirmWithdrawDialogVisible(false)}
        slots={{ transition: Transition }}
      >
        <DialogTitle id="alert-dialog-title">
          {t('tournament.action.withdrawConfirmation')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText component={'div'} id="alert-dialog-description">
            {menuTeam.players.map((player) => <Box  key={player.id} sx={{ display: 'flex', color: '#333' }}>
              <Typography width={150}>{player.officialName[language]}</Typography>
              <Typography>{player.club}</Typography>
            </Box>)}
            <Typography style={{ fontSize: '14px', paddingTop: 16 }}>{t('tournament.action.withdrawWarning')}</Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button loading={withdrawButtonLoading} color='error' onClick={() => withdrawTeam(menuTeam.id)} >{t('action.confirm')}</Button>
          <Button onClick={() => setConfirmWithdrawDialogVisible(false)} autoFocus>
            {t('action.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
export default ParticipantMenu