'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import {  MAP_GROUP_NAME, MAP_ROUND_NAME, SERVICE_ENDPOINT } from '@/app/constants'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { RootState } from '@/app/libs/redux/store'
import { useAppDispatch } from '@/app/providers'
import {
  Language,
  Match,
  MatchStep,
  // Language,
  TournamentEvent,
  TournamentMenu
} from '@/type'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Paper, Popover, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import axios from 'axios'
import { useParams } from 'next/navigation'
import React, { MouseEvent, useEffect, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import MenuDrawer from '../MenuDrawer'
import moment from 'moment'
import MatchCard from './MatchCard'
import { AddCircle, ArrowBackIos, ArrowDropDown } from '@mui/icons-material'
import { useTournament } from '@/app/libs/data'

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  )
}


interface Group {
  [key: string]: { // This index signature allows for keys like 'A' and 'B'
    [key: string]: Match[]; // Each key ('0', '1', '2', etc.) maps to an array of strings
  };
}
interface Playoff {
  [key: string]: Match[];
}
interface MatchData {
  group: Group;
  playoff: Playoff;
}
const Organizer = () => {
  // const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [tabIndex, setTabIndex] = useState(0)
  const [numCourt, setNumCourt] = useState(8)
  const [startTime, setStartTime] = useState(9)
  const [matchDuration, setMatchDuration] = useState(25)
  const [eventMatches, setEventMatches] = useState([])
  const [selectedDay, setSelectedDay] = useState<string|null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [matchInIterationFormat, setMatchInIterationFormat] = useState<MatchData>({ group:{}, playoff:{} })
  const [tableRowData, setTableRowData ] = useState<(Match | null | string)[][]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(-1)
  const [selectedCourt, setSelectedCourt] = useState(-1)
  const { tournament } = useTournament(params.id as string)

  const [tableRowDataHistory, setTableRowDataHistory] = useState<(Match | null | string)[][][]>([])

  const [step, setStep] = useState<string | null>(null)
  const [group, setGroup] = useState<string | null>(null)
  const [round, setRound] = useState<string | null>(null)

  const open = Boolean(anchorEl)
  const handleClose = () => {
    setAnchorEl(null)
    setStep(null)
    setGroup(null)
    setRound(null)
  }

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
  }, [dispatch])

  useEffect(() => {
    generateTimeSlots(matchDuration)
  }, [])

  const getMatches = async(eventID: string) => {
    const response = await axios.get(`${SERVICE_ENDPOINT}/matches?eventID=${eventID}&status=waiting`)
    setEventMatches(response.data)
    const iteratableMatch: MatchData = response.data.reduce((prev: MatchData, match:Match) => {
      const accumulater = { ...prev }
      if(!match.step) return accumulater
      if(!accumulater[match.step]){
        accumulater[match.step] = {}
      }

      if(match.round === undefined) return accumulater

      if(match.step === MatchStep.Group){
        accumulater[MatchStep.Group] = { ...accumulater[MatchStep.Group] }
        if(match.groupOrder === undefined) return accumulater

        if(!accumulater[match.step][MAP_GROUP_NAME[match.groupOrder].NAME]){
          accumulater[match.step][MAP_GROUP_NAME[match.groupOrder].NAME] = {}
        }

        if(!accumulater[match.step][MAP_GROUP_NAME[match.groupOrder].NAME][match.round]){
          accumulater[match.step][MAP_GROUP_NAME[match.groupOrder].NAME][match.round] = []
        }
        accumulater[match.step][MAP_GROUP_NAME[match.groupOrder].NAME][match.round].push(match)
      }else if(match.step === MatchStep.PlayOff){
        accumulater[MatchStep.PlayOff] = { ...accumulater[MatchStep.PlayOff] }
        if(!accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]]){
          accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]] = []
        }
        accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]].push(match)
      }
      return accumulater

    }, {})
    setMatchInIterationFormat(iteratableMatch)
  }

  const onGenerateMatches = async(eventID:string) => {
    await axios.post(`${SERVICE_ENDPOINT}/events/generate-matches`, { eventID }, { withCredentials :true })
    getMatches(eventID)
  }

  useEffect(() => {
    if(tournament){
      getMatches(tournament.events[tabIndex].id)
      setSelectedDay(getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate))[0].toISOString())
    }
  }, [tournament])

  useEffect(() => {
    if(!tournament) return
    const eventID = tournament.events[tabIndex].id
    getMatches(eventID)
  }, [tabIndex])

  useEffect(() => {
    generateTimeSlots(matchDuration, startTime)
  }, [matchDuration, numCourt, startTime])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue)
  }

  const onSelectCell = (e:MouseEvent<HTMLButtonElement>, timeSlot:number, court:number) => {
    setAnchorEl(e.currentTarget)
    setSelectedCourt(court)
    setSelectedTimeSlot(timeSlot)
  }

  const sortMatch = (a:Match, b:Match) => {
  // Sort by 'step' first: 'group' comes before 'ko'
    if (a.step !== b.step) {
      return a.step === MatchStep.Group ? -1 : 1
    }

    if(a.round === undefined || b.round === undefined) return 0


    if (a.step === MatchStep.Group) {
      // Sort 'group' items by 'round' ascending
      if (a.round !== b.round) {
        return a.round - b.round
      }
    } else if (a.step === MatchStep.PlayOff) {
      // Sort 'ko' items by 'round' descending
      if (a.round !== b.round) {
        return b.round - a.round
      }
    }

    if(a.groupOrder === undefined || b.groupOrder === undefined) {
      if(a.bracketOrder === undefined || b.bracketOrder === undefined) return 0
      return a.bracketOrder - b.bracketOrder
    }

    return a.groupOrder - b.groupOrder

  }

  const renderTableCell = (match: (Match | null | string), i: number, j: number) => {
    if (typeof match === 'string'){
      return match
    }else if(match === null){
      return <Button onClick={(e:MouseEvent<HTMLButtonElement>) => onSelectCell(e, i, j)}><AddCircle/></Button>
    }else {
      if(match.round === undefined) return

      return (
        <Button onClick={(e:MouseEvent<HTMLButtonElement>) => onSelectCell(e, i, j)}>
          <Box>
            <Typography>{match.event?.name[language]}</Typography>
            {match.groupOrder !== undefined ? <Typography>Group {MAP_GROUP_NAME[match.groupOrder].NAME}</Typography> : null}
            <Typography>{match.step === MatchStep.Group ? `Round ${match.round + 1}` : MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]}</Typography>
            {match.bracketOrder !== undefined && <Typography>{`Bracket  ${match.bracketOrder}`}</Typography>}
          </Box>
        </Button>
      )
    }
  }

  const onSaveSchedule = async() => {

    const matches = tableRowData.reduce((accumulator: {id: string, date: string}[], currentTimeSlot: (Match | null | string)[]) => {

      for(let i = 1;i < currentTimeSlot.length; i++){
        if(typeof currentTimeSlot[i] === 'string' || currentTimeSlot[i] === null) {
          continue
        }

        const date = moment(selectedDay)
          .set('hour', Number(currentTimeSlot[0]?.toString().split(':')[0]))
          .set('minute', Number(currentTimeSlot[0]?.toString().split(':')[1]))
          .toISOString()
        const match: Match = currentTimeSlot[i] as Match

        accumulator.push({ id: match.id, date })
      }
      return accumulator
    }, [])


    await axios.post(`${SERVICE_ENDPOINT}/matches/schedule`, {
      tournamentID: tournament.id,
      matches,
    }, { withCredentials:true })
  }

  const generateTimeSlots = (
    stepMinutes: number,
    startHour = 5,
    startMinute = 0,
    endHour = 24,
    endMinute = 30
  ) => {
    const slots: (Match | null | string)[][] = []
    const totalMinutes = endHour * 60 + endMinute
    let currentMinutes = startHour * 60 + startMinute

    while (currentMinutes <= totalMinutes) {
      const hours = Math.floor(currentMinutes / 60)
      const minutes = currentMinutes % 60
      slots.push(
        [`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
          , ...Array.from({ length:numCourt }, () => null)]
      )
      currentMinutes += stepMinutes
    }
    setTableRowData(slots)
  }

  const getDaysArray = (startDate: Date, endDate: Date): Date[] => {
    const days: Date[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      days.push(new Date(current)) // clone, don’t push reference
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const onChangeDay = (
    event: React.MouseEvent<HTMLElement>,
    newDay: string,
  ) => {
    setSelectedDay(newDay)
  }

  const onGenerateMatchNumber = async() => {
    await axios.post(`${SERVICE_ENDPOINT}/matches/assign-match-number`,
      { tournamentID: tournament.id },
      { withCredentials:true }
    )
  }

  const onAddMatchToSchedule = (matches: Match[]) => {
    // save history before modify
    const tempHistory = [...tableRowDataHistory]
    const deepCopyTableRowData = JSON.parse(JSON.stringify(tableRowData))
    tempHistory.push(deepCopyTableRowData)
    setTableRowDataHistory(tempHistory)


    const tempTableRowData = [...tableRowData]
    let tempCourt = selectedCourt
    let tempTimeSlot = selectedTimeSlot
    let currentRound = matches[0].round
    let currentGroup = matches[0].groupOrder
    let offset = 0

    matches.sort(sortMatch)
    while(matches.length > 0){
      if(matches[0].groupOrder !== currentGroup){
        offset = tempCourt - selectedCourt
        tempCourt = selectedCourt
        tempTimeSlot = selectedTimeSlot
        currentGroup = matches[0].groupOrder
        currentRound = matches[0].round
      }
      if(matches[0].round === currentRound){
        if(tempTableRowData[tempTimeSlot][tempCourt + offset] !== null){
          tempCourt++
          if((tempCourt + offset) > numCourt){
            tempCourt = 1
            tempTimeSlot++
            offset = 0
          }
          continue
        }
        tempTableRowData[tempTimeSlot][tempCourt + offset] = matches.shift() ?? 'no match'
        tempCourt++
        if((tempCourt + offset) > numCourt + 1){
          tempCourt = 1
          tempTimeSlot++
          offset = 0
        }
      }else {
        currentRound = matches[0].round ?? -1
        tempCourt = selectedCourt
        tempTableRowData[tempTimeSlot += 2][tempCourt + offset] = matches.shift() ?? 'no match'
      }
    }
    setTableRowData(tempTableRowData)

    handleClose()
  }

  const getAllGroupMatches = (data: MatchData['group']) => {
    // 1. Get the 'group' object
    const groupData = data

    // 2. Get all the top-level values (the objects for group 'A', 'B', etc.)
    const groupObjects = Object.values(groupData)

    console.log(groupObjects)

    // 3. Get all the arrays of matches from each group and flatten them.
    //    `flatMap` is a convenient way to map and flatten in one step.
    const allMatches = groupObjects.flatMap((group) => {
    // Get the arrays of matches from each individual group (e.g., group 'A' or 'B')
      return Object.values(group)
    })

    // 4. Flatten the result one more time to get a single array of matches
    const flattedMatches = allMatches.flat()

    return flattedMatches.sort(sortMatch)
  }


  const getAllMatchesFromGroup = (data:MatchData[MatchStep.Group][string]): Match[] => {
  // 1. Get the object for the specific group (e.g., 'A')
    const group = data

    // 2. Check if the group exists to avoid errors
    if (!group) {
      return []
    }

    // 3. Get all the values (the nested arrays of matches)
    const nestedArrays = Object.values(group)

    // 4. Use `flat()` to flatten the array of arrays into a single array
    const allMatches = nestedArrays.flat()

    // 5. Sort array
    const sortedMatches = allMatches.sort(sortMatch)
    return sortedMatches
  }

  const renderPopOver = () => {
    if(!step && !group && !round){
      if(Object.keys(matchInIterationFormat).length < 1) return <Typography>Please generate match first</Typography>
      return (
        <Box>
          {Object.entries(matchInIterationFormat).map(([key]) => {
            return <Button key={`step-${key}`} onClick={() => setStep(key)}>{key}</Button>
          })}
          {/* <Button key={'step-all'} onClick={() => console.log('add')}>All</Button> */}
        </Box>
      )
    }

    if(step === MatchStep.PlayOff){
      if(round){
        return (
          <Box>
            <Button key={'round-back'} onClick={() => setRound(null)}><ArrowBackIos/></Button>
            {matchInIterationFormat[MatchStep.PlayOff][round].map((match, i) => {
              if(match.round === undefined) return
              return <Button key={`match-${match.id}`} onClick={() => onAddMatchToSchedule([match])}>{`${MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]} (${i + 1}/${matchInIterationFormat[MatchStep.PlayOff][round].length})`}</Button>
            })}
            <Button key={'round-all'} onClick={() => onAddMatchToSchedule(matchInIterationFormat[MatchStep.PlayOff][round])}>All</Button>
          </Box>
        )
      }else{
        return (
          <Box>
            <Button key={'round-back'} onClick={() => setStep(null)}><ArrowBackIos/></Button>
            {Object.entries(matchInIterationFormat[MatchStep.PlayOff]).map(([key]) => {
              return <Button key={`round-${key}`} onClick={() => setRound(key)}>{key}</Button>
            })}
            {/* <Button key={'match-all'} onClick={() => console.log('add')}>All</Button> */}
          </Box>
        )
      }
    }else if(step === MatchStep.Group){
      if(!group){
        return (
          <Box>
            <Button key={'step-back'} onClick={() => setStep(null)}><ArrowBackIos/></Button>
            {Object.entries(matchInIterationFormat['group']).map(([key]) => {
              return (
                <Button key={`group-${key}`} onClick={() => setGroup(key)}>{key}</Button>
              )
            })}
            <Button key={'step-all'} onClick={() => onAddMatchToSchedule(getAllGroupMatches(matchInIterationFormat['group']))}>All</Button>
          </Box>
        )
      }else{
        if(!round){
          return (
            <Box>
              <Button key={'round-back'} onClick={() => setGroup(null)}><ArrowBackIos/></Button>
              {Object.entries(matchInIterationFormat[MatchStep.Group][group]).map(([key]) => {
                return <Button key={`round-${key}`} onClick={() => setRound(key)}>{`Round ${Number(key) + 1}`}</Button>
              })}
              <Button key={'round-all'} onClick={() => onAddMatchToSchedule(getAllMatchesFromGroup(matchInIterationFormat['group'][group]))}>All</Button>
            </Box>
          )
        }
        return (
          <Box>
            <Button key={'match-back'} onClick={() => setRound(null)}><ArrowBackIos/></Button>
            {matchInIterationFormat['group'][group][round].map((match, i) => {
              if(match.round === undefined) return
              return (
                <Button key={`match-${match.id}`} onClick={() => onAddMatchToSchedule([match])}>
                  {`Round ${match.round + 1} (${i + 1}/${matchInIterationFormat['group'][group][round].length})`}
                </Button>
              )
            })}
            <Button key={'match-all'} onClick={() => onAddMatchToSchedule(matchInIterationFormat['group'][group][round])}>All</Button>
          </Box>
        )

      }
    }
  }

  const onUndo = () => {
    const tempHistory = [...tableRowDataHistory]
    const history = tempHistory.pop()
    if(history === undefined) return
    setTableRowData(history)
    setTableRowDataHistory(tempHistory)
  }

  if(!tournament) return

  return (
    <TournamentLayout tournament={tournament}>
      <Box sx={{ display: 'flex' }}>
        <MenuDrawer tournamentID={tournament.id}/>
        <Box sx={{ width: '100%' }}>
          <ToggleButtonGroup aria-label="Basic button group" sx={{ m:1 }} value={selectedDay} onChange={onChangeDay} exclusive>
            {getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d, i) => <ToggleButton key={`day-${i}`} value={d.toISOString()}>{moment(d).format('ddd, DD.MM')}</ToggleButton>)}
          </ToggleButtonGroup>
          <Box sx={{ display:'flex', gap:2, margin: 1, pt:2 }}>
            <TextField
              autoFocus
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value))}
              size='small'
              label="เวลาเริ่ม"
              variant="outlined"
              type='number' />
            <TextField
              autoFocus
              value={numCourt}
              onChange={(e) => setNumCourt(Number(e.target.value))}
              size='small'
              label="จำนวนคอร์ด"
              variant="outlined"
              type='number' />
            <TextField
              value={matchDuration}
              onChange={(e) => setMatchDuration(Number(e.target.value))}
              size='small'
              label="เวลาต่อแมตช์ (นาที)"
              variant="outlined"
              type='number' />
            <Button sx={{ borderRadius: 10, width:'100px' }} color='error' variant='contained' size='large' onClick={() => generateTimeSlots(matchDuration, startTime)}>Reset</Button>
            <Button sx={{ borderRadius: 10, width:'100px'  }} color='primary' variant='contained' size='large' disabled={tableRowDataHistory.length < 1} onClick={onUndo}>Undo</Button>
            <Button sx={{ borderRadius: 10, width:'100px'  }} color='primary' variant='contained' size='large' onClick={onSaveSchedule}>Save</Button>
            <Button sx={{ borderRadius: 10 }} color='primary' variant='contained' size='large' onClick={onGenerateMatchNumber}>Gen. Match No.</Button>
          </Box>

          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="basic tabs example"
          >
            {tournament.events.map((e: TournamentEvent, idx) => (
              <Tab key={idx} label={e.name[language]} />
            ))}
          </Tabs>
          <Box component="main" sx={{ flexGrow: 1, p: 1, pt:0 }}>
            {tournament.events.map(((event, idx) => {
              return (
                <TabPanel value={tabIndex} index={idx} key={event.id} >
                  {<>
                    <Button variant='contained' onClick={() => onGenerateMatches(event.id)}>Generate Matches</Button>
                    <Accordion>
                      <AccordionSummary expandIcon={<ArrowDropDown />}>
                        <Typography component="span">{`Matches in group stage (${eventMatches.filter((a:Match) => a.step === MatchStep.Group).length})`}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display:'flex', gap: 1, flexWrap:'wrap' }}>
                          {eventMatches.filter((a:Match) => a.step === MatchStep.Group).sort(sortMatch).map((match: Match) => <MatchCard key={match.id} match={match}/>)}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                    <Accordion>
                      <AccordionSummary expandIcon={<ArrowDropDown />}>
                        <Typography component="span">{`Matches in play off stage (${eventMatches.filter((a:Match) => a.step === MatchStep.PlayOff).length})`}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display:'flex', gap: 1, flexWrap:'wrap' }}>
                          {eventMatches.filter((a:Match) => a.step === MatchStep.PlayOff).sort(sortMatch).map((match: Match) => <MatchCard key={match.id} match={match}/>)}
                        </Box>
                      </AccordionDetails>
                    </Accordion></>
                  }

                </TabPanel>
              )
            }))}
          </Box>
          <TableContainer component={Paper} sx={{ maxWidth: '100%', maxHeight: 500 }} >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {
                    ['เวลา/คอร์ด', ...Array.from({ length:numCourt }, (_, i) => `Court ${(i + 1)}`)].map((court) => <TableCell align='center' key={`court-${court}`}>{court}</TableCell>)
                  }
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  tableRowData.map((timeSlot, i) => (
                    <TableRow key={`timeSlot-${i}`}>
                      {
                        timeSlot.map((match, j) => (
                          <TableCell key={`match-${j}`} align='center'>
                            {renderTableCell(match, i, j)}
                          </TableCell>

                        ))
                      }
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p:3, minWidth: 300, display:'flex', justifyContent: 'space-around' }}>
          {renderPopOver()}
        </Box>
      </Popover>
    </TournamentLayout>
  )

}
export default Organizer