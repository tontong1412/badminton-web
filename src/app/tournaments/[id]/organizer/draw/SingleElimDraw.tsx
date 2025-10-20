import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import PlayerPopover from '../../draw/PlayerPopover'
import { MouseEvent, useEffect, useState } from 'react'
import { Event, EventTeam, Language, Player } from '@/type'
import { useEvent } from '@/app/libs/data'
import { useTranslation } from 'react-i18next'
import DrawBracket from './drawBracket'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import { SERVICE_ENDPOINT } from '@/app/constants'
import axios from 'axios'
import Transition from '@/app/components/ModalTransition'

interface SingleElimDrawProps {
  eventID: string
}

interface DataRow extends EventTeam {
  draw: number | undefined
}

const SingleElimDraw = ({ eventID }: SingleElimDrawProps) => {
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [draw, setDraw] = useState<Event['draw']>({})
  const { event } = useEvent(eventID)
  const [bracketValue, setBracketValue] = useState<string[]>([])
  const [dataRow, setDataRow] = useState<DataRow[]>([])
  const [confirmVisible, setConfirmVisible] = useState(false)

  useEffect(() => {
    if(event){
      if(event.draw.elimination){
        setDraw(event.draw)
      }else{
        const tempDraw: string[] = [...Array.from({ length: Math.pow(2, (Math.ceil(Math.log2(event.teams.length)))) }, () => 'Team')]
        setDraw({ elimination: tempDraw })
        setBracketValue([...Array.from({ length: event.teams.length }, () => '')])
      }
    }
  }, [event])

  useEffect(() => {
    if(event){
      const initialBracketValue = event.teams.map((team) => {
        const order = draw.elimination?.findIndex((e) => typeof e === 'string' ? false : e.id === team.id)
        if(order !== undefined && order !== -1){
          return order
        }
        return -1
      })
      setBracketValue(initialBracketValue.map((i) => (i + 1)?.toString()))
    }
  }, [draw])

  useEffect(() => {
    if(event){
      const eventWithBracketOrder = event.teams.map((t) => {
        const bracketOrder = draw.elimination?.findIndex((order) => typeof order === 'string' ? undefined : order.id === t.id)
        return {
          ...t,
          draw: bracketOrder,
        }
      })
      setDataRow(eventWithBracketOrder)

    }
  }, [event, draw.elimination])


  const handleShowPlayerDetail = (e: MouseEvent<HTMLDivElement>, player: Player) => {
    setShowPlayer(player)
    setAnchorEl(e.currentTarget)
  }

  const handleChangeBracketOrder = (rowIndex: number, value: number|undefined) => {
    if(!value){
      if(!draw.elimination) draw.elimination = []
      const tempDrawElim = [...draw.elimination]
      const idx = tempDrawElim.findIndex((t) => typeof t === 'string' ? false : t.id === dataRow[rowIndex].id)
      tempDrawElim[idx] = event.draw.elimination?.[idx] ?? ''
      setDraw({ ...draw, elimination: tempDrawElim })
    }else{
      if(!draw.elimination) draw.elimination = []
      // first remove other team that has this bracket order
      const tempDrawElim = [...draw.elimination]
      const idx = tempDrawElim.findIndex((t) => typeof t === 'string' ? false : t.id === dataRow[rowIndex].id)
      tempDrawElim[idx] = event.draw.elimination?.[idx] ?? ''


      const tempDataRow = [...dataRow]
      const indexOfPreviouslyAssigned = tempDataRow.findIndex((t) => t.draw === value - 1)

      if(indexOfPreviouslyAssigned !== -1){
        tempDataRow[indexOfPreviouslyAssigned].draw = -1
        const tempBracketValue = [...bracketValue]
        tempBracketValue[indexOfPreviouslyAssigned] = ''
        setBracketValue(tempBracketValue)
      }


      tempDataRow[rowIndex].draw = value - 1
      setDataRow(tempDataRow)

      tempDrawElim[value - 1] = dataRow[rowIndex]
      setDraw({ ...draw, elimination: tempDrawElim })
    }

  }

  const onRandomDraw = async(eventID: string) => {
    try{
      const response = await axios.post(`${SERVICE_ENDPOINT}/events/random-draw`, {
        eventID
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

  const onChangeBracketValue = (idx: number, value:string) => {

    const tempBracketValue = [...bracketValue]
    tempBracketValue[idx] = value
    setBracketValue(tempBracketValue)
  }

  const onResetDraw = async(eventID:string) => {
    setDraw({
      ...draw,
      elimination: draw.elimination?.map((o) => typeof o === 'string' ? o : ''),
    })
    if(event){
      setBracketValue([...Array.from({ length: event.teams.length }, () => '')])
    }
    await axios.put(`${SERVICE_ENDPOINT}/events/${eventID}`, {
      '$set': {
        'draw.elimination':[]
      }
    }, { withCredentials:true })

    setConfirmVisible(false)
  }

  const onSaveDraw = async(eventID:string) => {
    try{
      await axios.put(`${SERVICE_ENDPOINT}/events/${eventID}`, {
        '$set': {
          'draw.elimination': draw.elimination
        }
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

  if(!event) return <CircularProgress/>

  return (
    <Box>
      <Box sx={{ display:'flex', gap:2, margin: 1 }}>
        <Button sx={{ borderRadius: 10, minWidth:'100px' }} onClick={() => setConfirmVisible(true)} color='error' variant='contained' size='large'>Reset</Button>
        <Button sx={{ borderRadius: 10, minWidth:'100px'  }} onClick={() => onRandomDraw(event.id)} color='primary' variant='contained' size='large'>Generate Bracket</Button>
        <Button sx={{ borderRadius: 10, minWidth:'100px'  }} onClick={() => onRandomDraw(event.id)} color='primary' variant='contained' size='large'>Random</Button>
        <Button sx={{ borderRadius: 10, minWidth:'100px'  }} onClick={() => onSaveDraw(event.id)} color='primary' variant='contained' size='large'>Save</Button>
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
                  <TableCell align="center">
                    <TextField
                      label="ลำดับสาย"
                      value={bracketValue[idx] ?? ''}
                      onChange={(e) => onChangeBracketValue(idx, e.target.value)}
                      size='small'
                      type='number'
                      onBlur={() => handleChangeBracketOrder(idx, Number(bracketValue[idx]))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
        </TableContainer>
        {draw.group && draw.group.length > 0 && <Divider sx={{ mt:3, mb:3 }}/>}
        <Box sx={{ width: '50%' }}>
          <DrawBracket draw={draw} order={draw.elimination ?? []} blockWidth={430}/>
        </Box>
      </Box>
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

export default SingleElimDraw