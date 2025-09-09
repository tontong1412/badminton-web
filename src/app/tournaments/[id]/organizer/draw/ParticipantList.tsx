import { MAP_GROUP_NAME, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { Event, EventTeam, Language, Player } from '@/type'
import { Box, Card, CardContent, CardHeader, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import axios from 'axios'
import { Dispatch, MouseEvent, SetStateAction, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import PlayerPopover from '../../participants/PlayerPopover'
import DrawBracket from './drawBracket'

interface ParticipantListProps {
  eventID: string,
  numGroup: number,
  groupArray: EventTeam[][],
  setGroupArray: Dispatch<SetStateAction<EventTeam[][]>>,
  setNumGroup: Dispatch<SetStateAction<number>>
}

const ParticipantList = ({ eventID, numGroup, groupArray, setGroupArray, setNumGroup }: ParticipantListProps) => {
  const { t } = useTranslation()
  const [event, setEvent] = useState<Event>()
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [groupDisplayArray, setGroupDisplayArray] = useState<(number)[]>([])

  const fetchEvent = async() => {
    try {
      const response = await axios(`${SERVICE_ENDPOINT}/events/${eventID}`)
      setEvent(response.data)
      setNumGroup(Math.floor(response.data.teams.length / 3))
    }
    catch (error) {
      console.error('Error fetching event:', error)
    }
  }

  useEffect(() => {
    fetchEvent()
  }, [])

  useEffect(() => {
    if(event){
      const initDisplayArray = event.teams.map(() => -1)
      setGroupDisplayArray(initDisplayArray)
      setGroupArray(event.draw.group ?? [])
    }

  }, [event])

  useEffect(() => {
    if(groupArray.length === 0 && event){
      const initDisplayArray = event?.teams.map(() => -1)
      setGroupDisplayArray(initDisplayArray)
      return
    }
    if(event){
      const tempGroupDisplayArray = [...groupDisplayArray]
      for(let g = 0;g < groupArray.length;g++){
        for(let t = 0;t < groupArray[g]?.length;t++){
          const idx = event.teams.findIndex((team) => team.id === groupArray[g][t].id)
          tempGroupDisplayArray[idx] = g
        }
      }
      setGroupDisplayArray(tempGroupDisplayArray)
    }
  }, [groupArray])

  const handleSelectChange = (group: (string|null|number), team: EventTeam, teamIndex: number) => {
    const oldGroup = groupDisplayArray[teamIndex]
    const tempArray = [...groupArray]

    if(oldGroup != -1){ // make change to already assigned team
      const indexToRemove = tempArray[oldGroup].findIndex((t) => t.id === team.id)
      tempArray[oldGroup].splice(indexToRemove, 1)
    }

    const groupNum = Number(group)

    if(!tempArray[groupNum]){
      tempArray[groupNum] = []
    }

    tempArray[groupNum].push(team)
    setGroupArray(tempArray)

    // const tempGroupDisplayArray = [...groupDisplayArray]
    // tempGroupDisplayArray[teamIndex] = groupNum

    // setGroupDisplayArray(tempGroupDisplayArray)
  }

  const handleShowPlayerDetail = (e: MouseEvent<HTMLDivElement>, player: Player) => {
    setShowPlayer(player)
    setAnchorEl(e.currentTarget)
  }
  if(!event || groupDisplayArray.length !== event?.teams.length) return null
  return (
    <Box sx={{ display:'flex', gap: 1, overflow: 'hidden', p:1, flexDirection:'column'  }}>
      <TableContainer component={Paper} sx={{ maxWidth: '100%', maxHeight: 500 }} >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('tournament.participants.team')}</TableCell>
              <TableCell>{t('tournament.participants.club')}</TableCell>
              <TableCell>{'กลุ่ม'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {event.teams?.map((team, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  {team.players.map((player) => {
                    return(<div key={player.id} onClick={(e) => handleShowPlayerDetail(e, player)}>
                      <Typography >{player.officialName[language]}</Typography>
                    </div>)
                  })}
                </TableCell>
                <TableCell>
                  {team.players.map((player) => <Typography key={player.id}>{player.club}</Typography>)}
                </TableCell>
                <TableCell>
                  <FormControl fullWidth>
                    <InputLabel id="event-label">{'Group'}</InputLabel>
                    <Select
                      size='small'
                      required
                      label="Event"
                      labelId="event-label"
                      value={groupDisplayArray[idx]?.toString()}
                      onChange={(e) => handleSelectChange(e.target.value, team, idx)}>
                      {MAP_GROUP_NAME.slice(0, numGroup).map((group) => (
                        <MenuItem key={group.VALUE} value={group.VALUE}>
                          {group.NAME}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
        {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
      </TableContainer>
      {groupArray.length > 0 && <Divider sx={{ mt:3, mb:3 }}/>}
      <Box sx={{ display:'flex', flexWrap: 'wrap', gap:2, width:'100%', overflow:'scroll', p:1, pt:0 }}>
        {
          groupArray.map((group, i) => <Card key={i} sx={{ width:'300px' }}>
            <CardHeader title={MAP_GROUP_NAME[i].NAME} sx={{ borderBottom: '1px solid #ddd' }}/>
            {
              group?.map((team, j) => <CardContent key={j}>
                {team?.players.map((p) => <Typography key={p.id}>{p.officialName[language]}</Typography>)}
              </CardContent>)
            }
          </Card>)
        }
      </Box>
      {/* {kODraw.length > 0 && <Divider sx={{ mt:3, mb:3 }}/>}
      <DrawBracket order={kODraw}/> */}
    </Box>
  )
}

export default ParticipantList