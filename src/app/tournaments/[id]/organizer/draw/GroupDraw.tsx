import { MAP_GROUP_NAME, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { Event, EventFormat, EventTeam, Language, Player } from '@/type'
import { Box, Button, Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import axios from 'axios'
import { MouseEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import PlayerPopover from '../../draw/PlayerPopover'
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
  const [numConsolation, setNumConsolation] = useState(8)
  const [numGroup, setNumGroup] = useState(4)
  const [activeStep, setActiveStep] = useState(0)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const { event } = useEvent(eventID)

  useEffect(() => {
    setNumPlayoff(numGroup * 2)
    setNumConsolation(numGroup * 2)
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
        for(let t = 0;t < draw.group[g]?.length;t++){
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
    setDraw({
      ...draw,
      group: [],
    })
    if(event){
      const initDisplayArray = event?.teams.map(() => -1)
      setGroupDisplayArray(initDisplayArray)
    }
    await axios.put(`${SERVICE_ENDPOINT}/events/${eventID}`, {
      '$set': {
        'draw.group':[]
      }
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

  const onRandomDraw = async(eventID: string, stage: 'group' | 'ko' | 'consolation') => {
    try{
      const payload: {
        eventID: string;
        stage: 'group' | 'ko' | 'consolation';
        groupCount: number;
        qualifiedCount: number;
        qualifiedConsolationCount?: number;
      } = {
        eventID,
        stage,
        groupCount: numGroup,
        qualifiedCount: numPlayoff,
      }

      if(stage === 'consolation'){
        payload.qualifiedConsolationCount = numConsolation
      }

      const response = await axios.post(`${SERVICE_ENDPOINT}/events/random-draw`, {
        ...payload
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

  const isConsolationFormat = event.format?.toLowerCase() === EventFormat.GroupPlayoffConsolation.toLowerCase()
  const drawSteps: { label: string; stage: 'group' | 'ko' | 'consolation' }[] = [
    { label: 'Group Draw', stage: 'group' },
    { label: 'Knockout Draw', stage: 'ko' },
    ...(isConsolationFormat ? [{ label: 'Consolation Draw', stage: 'consolation' as const }] : []),
  ]

  const currentStep = drawSteps[activeStep]

  const onRunStep = () => {
    if(!currentStep){
      return
    }
    onRandomDraw(event.id, currentStep.stage)
  }

  return (
    <Box sx={{ display:'flex', gap: 1, overflow: 'hidden', p:1, flexDirection:'column'  }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, margin: 1, width: '100%' }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            width: '100%',
            '& .MuiStep-root': { flex: 1 },
          }}>
          {drawSteps.map((step) => (
            <Step key={step.stage}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ display:'flex', gap:2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            autoFocus
            value={numGroup}
            onChange={(e) => setNumGroup(Number(e.target.value))}
            size='small'
            label="จำนวนกลุ่ม"
            variant="outlined"
            type='number' />

          {currentStep?.stage === 'ko' && <TextField
            value={numPlayoff}
            onChange={(e) => setNumPlayoff(Number(e.target.value))}
            size='small'
            label="จำนวนทีมที่เข้ารอบ"
            variant="outlined"
            type='number' />}

          {currentStep?.stage === 'consolation' && <TextField
            value={numConsolation}
            onChange={(e) => setNumConsolation(Number(e.target.value))}
            size='small'
            label="จำนวนทีมสายปลอบใจ"
            variant="outlined"
            type='number' />}

          <Button sx={{ borderRadius: 10 }} onClick={onRunStep} color='primary' variant='outlined' size='large'>
            {`Random ${currentStep?.label ?? ''}`}
          </Button>
          <Button
            sx={{ borderRadius: 10 }}
            onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
            disabled={activeStep === 0}
            variant='text'>
            Back
          </Button>
          <Button
            sx={{ borderRadius: 10 }}
            onClick={() => setActiveStep((prev) => Math.min(prev + 1, drawSteps.length - 1))}
            disabled={activeStep === drawSteps.length - 1}
            variant='text'>
            Next
          </Button>
          <Button sx={{ borderRadius: 10, width:'100px' }} onClick={() => setConfirmVisible(true)} color='error' variant='contained' size='large'>Reset</Button>
          <Button sx={{ borderRadius: 10, width:'100px'  }} onClick={() => onSaveDraw(event.id)} color='primary' variant='contained' size='large'>Save</Button>
        </Box>
        <Typography variant='body2' color='text.secondary'>
          {currentStep?.stage === 'group' && 'Step 1: จับสลากแบ่งกลุ่มก่อน'}
          {currentStep?.stage === 'ko' && 'Step 2: จับสลากรอบน็อคเอาท์จากจำนวนทีมที่เข้ารอบ'}
          {currentStep?.stage === 'consolation' && 'Step 3: จับสลากสายปลอบใจแยกจากรอบหลัก'}
        </Typography>
      </Box>
      {currentStep?.stage === 'group' && (
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
                          <Typography >{player.officialName?.[language]}</Typography>
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
            {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl} useHandicap={event.tournament.useHandicap}/>}
          </TableContainer>
          {draw.group && draw.group.length > 0 && <Divider sx={{ mt:3, mb:3 }}/>}
          <Box sx={{ display:'flex', flexWrap: 'wrap', gap:2, width:'50%', overflow:'scroll', p:1, pt:0, maxHeight: 500 }}>
            {
              draw.group?.map((group, i) => <Card key={i} sx={{ width:'320px' }}>
                <CardHeader title={MAP_GROUP_NAME[i].NAME} sx={{ borderBottom: '1px solid #ddd' }}/>
                {
                  group?.map((team, j) => <CardContent key={j}>
                    {team?.players.map((p) => <Box key={p.id} display={'flex'}>
                      <Typography width={150}>{p.officialName?.[language]}</Typography>
                      <Typography >{p.club}</Typography>
                    </Box>)}
                  </CardContent>)
                }
              </Card>)
            }
          </Box>
        </Box>
      )}

      {currentStep?.stage === 'ko' && (
        <>
          <Typography variant='h6' sx={{ mb: 1 }}>Knockout</Typography>
          <DrawBracket draw={draw} order={draw.ko ?? []} setDraw={setDraw}/>
        </>
      )}

      {currentStep?.stage === 'consolation' && (
        <>
          <Typography variant='h6' sx={{ mb: 1 }}>Consolation</Typography>
          <DrawBracket draw={draw} order={draw.consolation ?? []}/>
        </>
      )}
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
