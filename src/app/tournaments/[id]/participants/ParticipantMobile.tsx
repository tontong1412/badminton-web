'use client'

import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { useSelector } from '@/app/providers'
import { Event, EventTeam, Language, PaymentStatus, Player, TeamStatus } from '@/type'
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Menu, MenuItem, Typography } from '@mui/material'
import axios from 'axios'
import Image from 'next/image'

import { MouseEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PlayerPopover from './PlayerPopover'
import ContactPersonModal from '@/app/components/ContactPersonModal'
import PaymentModal from '@/app/components/PaymentModal'
import NoteModal from '@/app/components/NoteModal'
import Transition from '@/app/components/ModalTransition'
import moment from 'moment'
import ShuttlecockCreditModal from '@/app/components/ShuttlecockCreditModal'

interface ParticipantMobileProps {
  eventID: string;
  isManager: boolean;
}

interface UpdateTeamPayload {
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
}

const ParticipantMobile = ({ eventID, isManager }: ParticipantMobileProps) => {
  const { t } = useTranslation()
  const [event, setEvent] = useState<Event>()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [anchorElMenu, setAnchorElMenu] = useState<null | HTMLElement>(null)
  const [menuTeam, setMenuTeam] = useState<EventTeam | null>(null)
  const [contactPersonModalVisible, setContactPersonModalVisible] = useState(false)
  const [showContact, setShowContact] = useState<Player | null>(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [confirmWithdrawDialogVisible, setConfirmWithdrawDialogVisible] = useState(false)
  const [shuttlecockDialogVisible, setShuttlecockDialogVisible] = useState(false)
  const [withdrawButtonLoading, setWithdrawButtonLoading] = useState(false)
  useEffect(() => {
    const fetchEvent = async() => {
      try {
        const response = await axios(`${SERVICE_ENDPOINT}/events/${eventID}`)
        setEvent(response.data)
      }
      catch (error) {
        console.error('Error fetching event:', error)
      }
    }
    fetchEvent()
  }, [])

  const sortTeams = (a:EventTeam, b:EventTeam) => {
    if(a.slipTimestamp === undefined && b.slipTimestamp === undefined){
      return moment(a.date).diff(moment(b.date))
    }
    if(a.date === undefined){
      return 1
    }
    if(b.date === undefined){
      return -1
    }
    return moment(a.slipTimestamp).diff(moment(b.slipTimestamp))
  }

  const filterTotal = (team: EventTeam) => {
    return team.paymentStatus === PaymentStatus.Paid || team.paymentStatus === PaymentStatus.Pending
  }

  const withdrawTeam = async(teamID: string) => {
    setWithdrawButtonLoading(true)
    const payload: {teamID: string, eventID: string} = {
      teamID,
      eventID
    }

    const response = await axios.post(`${SERVICE_ENDPOINT}/events/withdraw`, payload, { withCredentials:true })
    setEvent(response.data)
    setConfirmWithdrawDialogVisible(false)
    setWithdrawButtonLoading(false)
  }

  const updateTeam = async(teamID: string, field: string, value: unknown) => {
    const payload : UpdateTeamPayload = {
      eventID,
      teamID,
      field,
      value
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-team`, payload, { withCredentials: true })
    setEvent(response.data)
  }
  const handleShowPlayerDetail = (e: MouseEvent<HTMLDivElement>, player: Player) => {
    setShowPlayer(player)
    setAnchorEl(e.currentTarget)
  }

  const handleCloseMenu = () => {
    setAnchorElMenu(null)
    setMenuTeam(null)
  }

  return (
    <Box>
      <Typography sx={{ textAlign:'right' }}>{`${t('tournament.registration.total')} ${event?.teams.filter(filterTotal).length}/${event?.limit}`}</Typography>
      {
        event?.teams.sort(sortTeams).map((team) => (
          <Card key={team.id} sx={{ marginBottom: 2 }}>
            <CardHeader
              sx={{ borderBottom: '1px solid #ddd' }}
              action={
                <Box>
                  <Chip
                    size='small'
                    sx={{ marginRight: '3px' }}
                    label={MAP_DECISION_STATUS[team.status][language]}
                    variant='outlined'
                    color={MAP_DECISION_STATUS[team.status].color} />
                  <Chip
                    size='small'
                    label={MAP_PAYMENT_STATUS[team.paymentStatus][language]}
                    variant='outlined'
                    color={MAP_PAYMENT_STATUS[team.paymentStatus].color} />
                </Box>
              }
              title={<Typography >{t('tournament.registration.event')} {event.name[language]}</Typography>}
            />
            <CardContent >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>

                  {team.players.map((p: Player) => <div key={p.id}>
                    <Box sx={{ display: 'flex' }}>
                      <div key={p.id} onClick={(e) => handleShowPlayerDetail(e, p)}>
                        <Typography width={150}>{p.officialName[language]}</Typography>
                      </div>
                      <Typography>{p.club}</Typography>
                    </Box>
                  </div>)}
                </Box>
                <Box sx={{ display: 'flex', gap: '5px' }}>
                  <div style={{ position: 'relative', width: '20px', height: 'auto' }}>
                    <Image alt='shuttle-icon' src='/shuttlecock.png' fill style={{ objectFit: 'contain' }}/>
                  </div>
                  <Typography>{team.shuttlecockCredit}</Typography>
                </Box>
              </Box>
              {team.note && <Typography sx={{ pt:2 }}>{`${t('tournament.registration.note')}: ${team.note}`}</Typography>}

            </CardContent>
            {isManager &&
            <CardActions sx={{ display: 'flex', justifyContent: team.status === TeamStatus.Idle ?  'space-between' : 'center', borderTop: '1px solid #ddd', p:0 }}>
              {team.status === TeamStatus.Idle && <Button fullWidth sx={{ width: '100%' }} onClick={() => updateTeam(team.id, 'status', TeamStatus.Approved)} size="small">{t('tournament.action.approve')}</Button>}
              {team.status === TeamStatus.Idle && <Button fullWidth sx={{ width: '100%' }} onClick={() => updateTeam(team.id, 'status', TeamStatus.Reject)} size="small">{t('tournament.action.reject')}</Button>}
              <div style={{ width: '100%', textAlign: 'center' }}>
                <Button fullWidth size="small" onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  setAnchorElMenu(event.currentTarget)
                  setMenuTeam(team)
                }}>{t('tournament.action.more')}</Button>
              </div>
            </CardActions>}
          </Card>
        ))
      }
      {showContact && <ContactPersonModal visible={contactPersonModalVisible} setVisible={setContactPersonModalVisible} player={showContact}/>}
      {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
      {menuTeam && event && <PaymentModal visible={paymentModalVisible} setVisible={setPaymentModalVisible} event={event} team={menuTeam} setEvent={setEvent} isManager={isManager} setTeam={setMenuTeam}/>}
      {menuTeam && event && <NoteModal visible={noteModalVisible} setVisible={setNoteModalVisible} event={event} team={menuTeam} setEvent={setEvent} setTeam={setMenuTeam} isManager={isManager}/>}
      {menuTeam && event && <ShuttlecockCreditModal visible={shuttlecockDialogVisible} setVisible={setShuttlecockDialogVisible} event={event} team={menuTeam} setEvent={setEvent} setTeam={setMenuTeam} isManager={isManager}/>}
      {menuTeam && <Menu
        id="admin-menu"
        anchorEl={anchorElMenu}
        open={Boolean(anchorElMenu)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          handleCloseMenu()
          setContactPersonModalVisible(true)
          setShowContact(menuTeam.contactPerson)
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
      }
      { menuTeam && <Dialog
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
      </Dialog>}
    </Box>
  )

}
export default ParticipantMobile