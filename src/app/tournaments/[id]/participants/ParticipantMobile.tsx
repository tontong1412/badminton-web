'use client'

import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { useSelector } from '@/app/providers'
import { Event, EventTeam, Language, Player, TeamStatus } from '@/type'
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Menu, MenuItem, Typography } from '@mui/material'
import axios from 'axios'
import Image from 'next/image'

import { MouseEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PlayerPopover from './PlayerPopover'
import ContactPersonModal from '@/app/components/ContactPersonModal'
import PaymentModal from '@/app/components/PaymentModal'

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
      <Typography sx={{ textAlign:'right' }}>{t('tournament.registration.total')} {event?.teams.length}</Typography>
      {
        event?.teams.map((team) => (
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
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      </Menu>}
    </Box>
  )

}
export default ParticipantMobile