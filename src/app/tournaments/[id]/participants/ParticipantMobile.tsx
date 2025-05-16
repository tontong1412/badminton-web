'use client'

import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { useSelector } from '@/app/providers'
import { Event, Language, Player, TeamStatus } from '@/type'
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Typography } from '@mui/material'
import axios from 'axios'
import Image from 'next/image'

import { MouseEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PlayerPopover from './PlayerPopover'

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
  useEffect(() => {
    const fetchEvent = async() => {
      console.log(eventID)
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

  return (
    <Box>
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
              {team.status === TeamStatus.Idle && <Button sx={{ width: '30%' }} onClick={() => updateTeam(team.id, 'status', TeamStatus.Approved)} size="small">{t('tournament.action.approve')}</Button>}
              {team.status === TeamStatus.Idle && <Button sx={{ width: '30%' }} onClick={() => updateTeam(team.id, 'status', TeamStatus.Reject)}size="small">{t('tournament.action.reject')}</Button>}
              <Button size="small" sx={{ width: '30%' }}>{t('tournament.action.more')}</Button>
            </CardActions>}
          </Card>
        ))
      }
      {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
    </Box>
  )

}
export default ParticipantMobile