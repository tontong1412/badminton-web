'use client'

import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { useSelector } from '@/app/providers'
import { EventTeam, Language, PaymentStatus, Player, TeamStatus } from '@/type'
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, CircularProgress, Typography } from '@mui/material'
import axios from 'axios'
import Image from 'next/image'

import { MouseEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PlayerPopover from './PlayerPopover'
import moment from 'moment'
import ParticipantMenu from './ParticipantMenu'
import { useEvent } from '@/app/libs/data'

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
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [anchorElMenu, setAnchorElMenu] = useState<null | HTMLElement>(null)
  const [menuTeam, setMenuTeam] = useState<EventTeam | null>(null)
  const { event, mutate: setEvent } = useEvent(eventID)

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

  if(!event)return <CircularProgress/>

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
      {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
      {menuTeam && event && isManager && <ParticipantMenu
        menuTeam={menuTeam}
        setMenuTeam={setMenuTeam}
        anchorElMenu={anchorElMenu}
        setAnchorElMenu={setAnchorElMenu}
        event={event}
        setEvent={setEvent}
        isManager={isManager}
      />}
    </Box>
  )

}
export default ParticipantMobile