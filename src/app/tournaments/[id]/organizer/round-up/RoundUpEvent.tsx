import { Box, Button, ButtonGroup, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
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
  drawKo: number;
  drawConsolation: number;
}

type DrawTarget = 'ko' | 'consolation'

const getRowDraw = (row: DataRow, target: DrawTarget) => {
  return target === 'ko' ? row.drawKo : row.drawConsolation
}

const buildBracketValue = (rows: DataRow[], target: DrawTarget) => {
  return rows.map((d) => {
    const drawOrder = getRowDraw(d, target)
    return drawOrder > -1 ? (drawOrder + 1).toString() : ''
  })
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
  const [drawTarget, setDrawTarget] = useState<DrawTarget>('ko')

  const hasConsolation = (event?.draw?.consolation?.length ?? 0) > 0

  useEffect(() => {
    if(matches){
      prepareData()
    }
    if(event){
      setDraw(event.draw)
      setBracketValue([...Array.from({ length: event.teams.length },  () => '')])
      if((event.draw.ko?.length ?? 0) === 0 && (event.draw.consolation?.length ?? 0) > 0){
        setDrawTarget('consolation')
      }
    }

  }, [matches, event])

  useEffect(() => {
    setBracketValue(buildBracketValue(dataRow, drawTarget))
  }, [dataRow, drawTarget])

  const onRoundUp = async() => {
    setLoading(true)
    await axios.post(`${SERVICE_ENDPOINT}/events/round-up`, {
      eventID: eventID,
      bracketOrder: draw.ko,
      consolationBracketOrder: draw.consolation,
    }, { withCredentials:true })
    setLoading(false)
  }

  const handleChangeBracketOrder = (rowIndex: number, value: number|undefined) => {
    const targetKey = drawTarget
    const targetDefaultDraw = event.draw[targetKey] ?? []
    const currentTargetDraw = [...(draw[targetKey] ?? [])]

    if(!value){
      const tempDataRow = [...dataRow]
      const row = tempDataRow[rowIndex]
      if(targetKey === 'ko'){
        row.drawKo = -1
      }else{
        row.drawConsolation = -1
      }
      setDataRow(tempDataRow)

      const idx = currentTargetDraw.findIndex((t) => typeof t === 'string' ? false : t.id === dataRow[rowIndex].team.id)
      if(idx >= 0){
        currentTargetDraw[idx] = targetDefaultDraw[idx] ?? ''
      }
      setDraw({ ...draw, [targetKey]: currentTargetDraw })
    }else{
      // first remove other team that has this bracket order
      const idx = currentTargetDraw.findIndex((t) => typeof t === 'string' ? false : t.id === dataRow[rowIndex].team.id)
      if(idx >= 0){
        currentTargetDraw[idx] = targetDefaultDraw[idx] ?? ''
      }


      const tempDataRow = [...dataRow]
      const indexOfPreviouslyAssigned = tempDataRow.findIndex((t) => getRowDraw(t, targetKey) === value - 1)

      if(indexOfPreviouslyAssigned !== -1){
        if(targetKey === 'ko'){
          tempDataRow[indexOfPreviouslyAssigned].drawKo = -1
        }else{
          tempDataRow[indexOfPreviouslyAssigned].drawConsolation = -1
        }
        const tempBracketValue = [...bracketValue]
        tempBracketValue[indexOfPreviouslyAssigned] = ''
        setBracketValue(tempBracketValue)
      }


      if(targetKey === 'ko'){
        tempDataRow[rowIndex].drawKo = value - 1
      }else{
        tempDataRow[rowIndex].drawConsolation = value - 1
      }
      setDataRow(tempDataRow)

      currentTargetDraw[value - 1] = dataRow[rowIndex].team
      setDraw({ ...draw, [targetKey]: currentTargetDraw })
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
          drawKo: -1,
          drawConsolation: -1
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
    const tempDrawConsolation = draw.consolation ? [...draw.consolation] : []

    const data = winner.reduce((prev, group) => {
      group.forEach((team, index) => {
        if(!event.draw.ko) return
        const defaultOrder = event.draw.ko.findIndex((e) => e === `ที่ ${index + 1} กลุ่ม ${team.group}`)
        const defaultConsolationOrder = event.draw.consolation?.findIndex((e) => e === `ที่ ${index + 1} กลุ่ม ${team.group}`) ?? -1

        if (defaultOrder >= 0 && autoFill) { // found
          tempDrawKO[defaultOrder] = drawTarget === 'ko' ? (team.team ?? 'not found') : tempDrawKO[defaultOrder]
        }

        if(defaultConsolationOrder >= 0 && autoFill){
          tempDrawConsolation[defaultConsolationOrder] = drawTarget === 'consolation' ? (team.team ?? 'not found') : tempDrawConsolation[defaultConsolationOrder]
        }


        prev.push({
          team: team.team,
          score: team.score,
          diff: team.diff,
          group: team.group,
          drawKo: autoFill && drawTarget === 'ko' ? defaultOrder : -1,
          drawConsolation: autoFill && drawTarget === 'consolation' ? defaultConsolationOrder : -1,
        })
      })
      return prev
    }, [])
    setDataRow(data)
    setBracketValue(buildBracketValue(data, drawTarget))
    setDraw({ ...draw, ko: tempDrawKO, consolation: tempDrawConsolation })
  }

  const onChangeBracketValue = (idx: number, value:string) => {

    const tempBracketValue = [...bracketValue]
    tempBracketValue[idx] = value
    setBracketValue(tempBracketValue)
  }
  return (
    <Box>
      <ButtonGroup sx={{ mb: 1 }} variant='contained'>
        <Button variant={drawTarget === 'ko' ? 'contained' : 'outlined'} onClick={() => setDrawTarget('ko')}>
          Playoff
        </Button>
        {hasConsolation && (
          <Button variant={drawTarget === 'consolation' ? 'contained' : 'outlined'} onClick={() => setDrawTarget('consolation')}>
            Consolation
          </Button>
        )}
      </ButtonGroup>
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
                      {team.team.players.map((p) => <Typography key={p.id}>{p.officialName?.[language]}</Typography>)}
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
          <Typography variant='h6' sx={{ mb: 1 }}>{drawTarget === 'ko' ? 'Playoff' : 'Consolation'}</Typography>
          <DrawBracket draw={draw} order={drawTarget === 'ko' ? (draw.ko ?? []) : (draw.consolation ?? [])} setDraw={setDraw} drawKey={drawTarget} blockWidth={430}/>
        </Box>
      </Box>
    </Box>
  )
}
export default RoundUpEvent
