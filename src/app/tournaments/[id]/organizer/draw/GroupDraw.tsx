import { MAP_GROUP_NAME, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { Event, EventTeam, Language, Player } from '@/type'
import { Box, Button, Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import axios from 'axios'
import { MouseEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import PlayerPopover from '../../participants/PlayerPopover'
import DrawBracket from './drawBracket'
import Transition from '@/app/components/ModalTransition'
import { useEvent } from '@/app/libs/data'

interface GroupDrawProps {
  eventID: string,
}

const GroupDraw = ({ eventID }: GroupDrawProps) => {
  const { t } = useTranslation()
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [groupDisplayArray, setGroupDisplayArray] = useState<(number)[]>([])
  const [draw, setDraw] = useState<Event['draw']>({})
  const [numPlayoff, setNumPlayoff] = useState(8)
  const [numGroup, setNumGroup] = useState(4)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const { event } = useEvent(eventID)

  useEffect(() => {
    setNumPlayoff(numGroup * 2)
  }, [numGroup])

  useEffect(() => {
    if(event){
      const initDisplayArray = event.teams.map(() => -1)
      setGroupDisplayArray(initDisplayArray)

      const numGroupTemp = Math.floor(event.teams.length / 4)
      setNumGroup(numGroupTemp)
      setDraw(event.draw)
    }

  }, [event])

  useEffect(() => {
    if(!event || !draw.group)return

    if(draw.group.length === 0){
      const initDisplayArray = event.teams.map(() => -1)
      setGroupDisplayArray(initDisplayArray)
      return
    }

    if(draw.group.length > 0){
      const tempGroupDisplayArray = [...groupDisplayArray]
      for(let g = 0;g < draw.group.length;g++){
        for(let t = 0;t < draw.group[g].length;t++){
          const idx = event.teams.findIndex((team) => team.id === draw.group?.[g][t].id)
          tempGroupDisplayArray[idx] = g
        }
      }

      for(let i = 0;i < event.teams.length - tempGroupDisplayArray.length;i++){
        tempGroupDisplayArray.push(-1)
      }

      setGroupDisplayArray(tempGroupDisplayArray)
    }
  }, [draw.group])

  const onResetDraw = async(eventID:string) => {
    setDraw({})
    if(event){
      const initDisplayArray = event?.teams.map(() => -1)
      setGroupDisplayArray(initDisplayArray)
    }
    await axios.put(`${SERVICE_ENDPOINT}/events/${eventID}`, {
      draw: {}
    }, { withCredentials:true })

    setConfirmVisible(false)
  }

  const onSaveDraw = async(eventID:string) => {
    try{
      await axios.put(`${SERVICE_ENDPOINT}/events/${eventID}`, {
        draw,
      }, { withCredentials:true })

    }catch (error){
      if(axios.isAxiosError(error)){
        console.error('Axios error:', error.message)
        if (error.response) {
          console.error('Status:', error.response.status)
          console.error('Data:', error.response.data)
        }
      }else{
        console.error('Unexpected error:', error)
      }
    }

  }

  const onRandomDraw = async(eventID: string) => {
    try{
      const response = await axios.post(`${SERVICE_ENDPOINT}/events/random-draw`, {
        eventID,
        groupCount: numGroup,
        qualifiedCount: numPlayoff
      }, { withCredentials:true })
      setDraw(response.data.draw)
    } catch(error){
      if(axios.isAxiosError(error)){
        console.error('Axios error:', error.message)
        if (error.response) {
          console.error('Status:', error.response.status)
          console.error('Data:', error.response.data)
        }
      }else{
        console.error('Unexpected error:', error)
      }
    }
  }

  const handleSelectChange = (group: (string|null|number), team: EventTeam, teamIndex: number) => {
    const oldGroup = groupDisplayArray[teamIndex]
    const tempArray = [...draw.group ?? []]

    if(oldGroup != -1){ // make change to already assigned team
      const indexToRemove = tempArray[oldGroup].findIndex((t) => t.id === team.id)
      tempArray[oldGroup].splice(indexToRemove, 1)
    }

    const groupNum = Number(group)

    if(!tempArray[groupNum]){
      tempArray[groupNum] = []
    }

    tempArray[groupNum].push(team)
    setDraw({
      ...draw,
      group: tempArray
    })
  }

  const handleShowPlayerDetail = (e: MouseEvent<HTMLDivElement>, player: Player) => {
    setShowPlayer(player)
    setAnchorEl(e.currentTarget)
  }

  if(!event || groupDisplayArray.length === 0) {
    return null
  }

  return (
    <Box sx={{ display:'flex', gap: 1, overflow: 'hidden', p:1, flexDirection:'column'  }}>
      <Box sx={{ display:'flex', gap:2, margin: 1 }}>
        <TextField
          autoFocus
          value={numGroup}
          onChange={(e) => setNumGroup(Number(e.target.value))}
          size='small'
          label="จำนวนกลุ่ม"
          variant="outlined"
          type='number' />
        <TextField
          value={numPlayoff}
          onChange={(e) => setNumPlayoff(Number(e.target.value))}
          size='small'
          label="จำนวนทีมที่เข้ารอบ"
          variant="outlined"
          type='number' />
        <Button sx={{ borderRadius: 10, width:'100px' }} onClick={() => setConfirmVisible(true)} color='error' variant='contained' size='large'>Reset</Button>
        <Button sx={{ borderRadius: 10, width:'100px'  }} onClick={() => onRandomDraw(event.id)} color='primary' variant='contained' size='large'>Random</Button>
        <Button sx={{ borderRadius: 10, width:'100px'  }} onClick={() => onSaveDraw(event.id)} color='primary' variant='contained' size='large'>Save</Button>
      </Box>
      <Box sx={{ display:'flex' }}>
        <TableContainer component={Paper} sx={{ maxWidth: '50%', maxHeight: 500 }} >
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
        {draw.group && draw.group.length > 0 && <Divider sx={{ mt:3, mb:3 }}/>}
        <Box sx={{ display:'flex', flexWrap: 'wrap', gap:2, width:'50%', overflow:'scroll', p:1, pt:0, maxHeight: 500 }}>
          {
            draw.group?.map((group, i) => <Card key={i} sx={{ width:'300px' }}>
              <CardHeader title={MAP_GROUP_NAME[i].NAME} sx={{ borderBottom: '1px solid #ddd' }}/>
              {
                group?.map((team, j) => <CardContent key={j}>
                  {team?.players.map((p) => <Typography key={p.id}>{p.officialName[language]}</Typography>)}
                </CardContent>)
              }
            </Card>)
          }
        </Box>
      </Box>
      {draw.ko && draw.ko?.length > 0 && <Divider sx={{ mt:3, mb:3 }}/>}
      <DrawBracket draw={draw} order={draw.ko ?? []} setDraw={setDraw}/>
      <Dialog
        open={confirmVisible}
        slots={{
          transition: Transition,
        }}
        keepMounted
        onClose={() => setConfirmVisible(false)}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle>{'คุณแน่ใจที่จะลบสายการแข่งขันนี้หรือไม่?'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            ข้อมูลที่ได้ทำการกรอกไว้จะถูกลบออกหมด กรุณายืนยัน
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color='error' onClick={() => onResetDraw(event.id)}>Confirm</Button>
          <Button onClick={() => setConfirmVisible(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default GroupDraw