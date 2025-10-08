import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import DrawBracket from '../draw/drawBracket'
import { useEvent, useMatchesEvent } from '@/app/libs/data'
import { useEffect, useState } from 'react'
import { Event, EventTeam, Language, MatchStep } from '@/type'
import { useTranslation } from 'react-i18next'
import { MAP_GROUP_NAME, SERVICE_ENDPOINT } from '@/app/constants'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import axios from 'axios'

interface RoundUpEventProps {
  eventID: string;
}

interface DataRow {
  score: number;
  diff:number;
  team:EventTeam;
  group: string;
  draw: number;
}

const RoundUpEvent = ({ eventID }: RoundUpEventProps) => {
  const { event } = useEvent(eventID)
  const [draw, setDraw] = useState<Event['draw']>({})
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { t } = useTranslation()
  const { matches } = useMatchesEvent(eventID)
  const [dataRow, setDataRow] = useState<DataRow[]>([])
  const [bracketValue, setBracketValue] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if(matches){
      prepareData()
    }
    if(event){
      setDraw(event.draw)
      setBracketValue([...Array.from({ length: event.teams.length },  () => '')])
    }

  }, [matches, event])

  const onRoundUp = async() => {
    setLoading(true)
    await axios.post(`${SERVICE_ENDPOINT}/events/round-up`, {
      eventID: eventID,
      bracketOrder: draw.ko,
    }, { withCredentials:true })
    setLoading(false)
  }

  const handleChangeBracketOrder = (rowIndex: number, value: number|undefined) => {
    if(!value){
      if(!draw.ko) draw.ko = []
      const tempDrawKO = [...draw.ko]
      const idx = tempDrawKO.findIndex((t) => typeof t === 'string' ? false : t.id === dataRow[rowIndex].team.id)
      tempDrawKO[idx] = event.draw.ko?.[idx] ?? ''
      setDraw({ ...draw, ko: tempDrawKO })
    }else{
      if(!draw.ko) draw.ko = []
      // first remove other team that has this bracket order
      const tempDrawKO = [...draw.ko]
      const idx = tempDrawKO.findIndex((t) => typeof t === 'string' ? false : t.id === dataRow[rowIndex].team.id)
      tempDrawKO[idx] = event.draw.ko?.[idx] ?? ''


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

      tempDrawKO[value - 1] = dataRow[rowIndex].team
      setDraw({ ...draw, ko: tempDrawKO })
    }

  }

  const prepareData = (autoFill = false) => {
    const matchesInGroupStage = matches.filter((m) => m.step === MatchStep.Group)
    if(!event?.draw?.group) return

    const teamWithScore = event.draw.group?.map((group, index) => {
      return group.map((team) => {
        let score = 0
        let diff = 0
        matchesInGroupStage?.filter((m) => m.teamA.id === team.id && m.event?.id === event.id).forEach((elm) => {
          score += elm.teamA.scoreSet
          diff += elm.teamA.scoreDiff ?? 0
        })

        matchesInGroupStage.filter((m) => m.teamB.id === team.id && m.event?.id === event.id).forEach((elm) => {
          score += elm.teamB.scoreSet
          diff += elm.teamB.scoreDiff ?? 0
        })


        return {
          score,
          diff,
          team,
          group: MAP_GROUP_NAME[index].NAME,
          draw: -1
        }
      })
    })

    const winner = teamWithScore?.map((group) => {
      group.sort((a, b) => {
        if (a.score === b.score) {
          return b.diff - a.diff
        } else {
          return b.score - a.score
        }
      })
      return group
    })
    const tempDrawKO = draw.ko ? [...draw.ko ] : []

    const data = winner.reduce((prev, group) => {
      group.forEach((team, index) => {
        if(!event.draw.ko) return
        const defaultOrder = event.draw.ko.findIndex((e) => e === `ที่ ${index + 1} กลุ่ม ${team.group}`)

        if (defaultOrder >= 0 && autoFill) { // found
          tempDrawKO[defaultOrder] = team.team ?? 'not found'
        }


        prev.push({
          team: team.team,
          score: team.score,
          diff: team.diff,
          group: team.group,
          draw: autoFill ? defaultOrder : -1
        })
      })
      return prev
    }, [])
    setDataRow(data)
    setBracketValue(data.map((d) => d.draw > -1 ? (d.draw + 1).toString() : ''))
    setDraw({ ...draw, ko: tempDrawKO })
  }

  const onChangeBracketValue = (idx: number, value:string) => {

    const tempBracketValue = [...bracketValue]
    tempBracketValue[idx] = value
    setBracketValue(tempBracketValue)
  }
  return (
    <Box>
      <Button onClick={() => prepareData(true)} variant='contained'>Auto Fill</Button>
      <Button sx={{ ml:1 }} onClick={onRoundUp} variant='contained' loading={loading}>Save</Button>
      <Box sx={{ display: 'flex', gap:2 }}>
        <Box sx={{ width: '50%' }}>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    กลุ่ม
                  </TableCell>
                  <TableCell>{t('tournament.participants.team')}</TableCell>
                  <TableCell>{t('tournament.participants.club')}</TableCell>
                  <TableCell align="center">
                    score
                  </TableCell>
                  <TableCell align="center">
                    diff
                  </TableCell>
                  <TableCell align="center">
                    Bracket Order
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dataRow?.map((team, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Typography >{team.group}</Typography>
                    </TableCell>
                    <TableCell>
                      {team.team.players.map((p) => <Typography key={p.id}>{p.officialName[language]}</Typography>)}
                    </TableCell>
                    <TableCell>
                      {team.team.players.map((p) => <Typography key={p.id}>{p.club}</Typography>)}
                    </TableCell>
                    <TableCell align="center">
                      <Typography>{team.score}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography>{team.diff}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        label="ลำดับสาย"
                        value={bracketValue[idx]}
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
          </TableContainer>
        </Box>
        <Box sx={{ width: '50%' }}>
          <DrawBracket draw={draw} order={draw.ko ?? []} setDraw={setDraw} blockWidth={430}/>
        </Box>
      </Box>
    </Box>
  )
}
export default RoundUpEvent