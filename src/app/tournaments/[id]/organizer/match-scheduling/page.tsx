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
  Tournament,
  TournamentEvent,
  TournamentMenu
} from '@/type'
import { Accordion, AccordionDetails, AccordionSummary, Avatar, Box, Button, Collapse, Divider, List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Paper, Popover, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import axios from 'axios'
import { useParams } from 'next/navigation'
import React, {  ElementType, Fragment, MouseEvent, useEffect, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import MenuDrawer from '../MenuDrawer'
import moment from 'moment'
import MatchCard from './MatchCard'
import { Add, AddAPhoto, AddBoxRounded, AddCircle, ArrowDropDown, Drafts, ExpandLess, ExpandMore, Groups, Inbox, Send, SportsScore, StarBorder } from '@mui/icons-material'
import { Courgette } from 'next/font/google'

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  )
}
const Organizer = () => {
  // const { t } = useTranslation()
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [tournament, setTournament] = useState<Tournament>()
  const [isManager, setIsManager] = useState(false)
  const [tabIndex, setTabIndex] = useState(0)
  const [numCourt, setNumCourt] = useState(8)
  const [matchDuration, setMatchDuration] = useState(25)
  const [eventMatches, setEventMatches] = useState([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [openNestedList, setOpenNestedList] = useState({})
  const [matchInIterationFormat, setMatchInIterationFormat] = useState({})
  const [tableRowData, setTableRowData ] = useState<(Match | null | string)[][]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(-1)
  const [selectedCourt, setSelectedCourt] = useState(-1)
  const open = Boolean(anchorEl)
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleClickList = (key) => {
    setOpenNestedList((prevState) => ({ ...prevState, [key]: !prevState[key] }))
  }


  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
  }, [dispatch])

  useEffect(() => {
    const fetchTournament = async() => {
      try {
        const response = await axios.get(`${SERVICE_ENDPOINT}/tournaments/${params.id}`)
        setTournament(response.data)
      } catch (error) {
        console.error('Error fetching tournament:', error)
      }
    }
    fetchTournament()
    generateTimeSlots(matchDuration)
  }, [])

  const getMatches = async(eventID: string) => {
    const response = await axios.get(`${SERVICE_ENDPOINT}/matches?eventID=${eventID}&status=waiting`)
    setEventMatches(response.data)
    const iteratableMatch = response.data.reduce((prev, match:Match) => {
      const accumulater = { ...prev }
      if(!match.step) return accumulater
      if(!accumulater[match.step]){
        accumulater[match.step] = {}
      }
      accumulater[match.step] = { ...accumulater[match.step] }
      if(match.round === undefined) return accumulater

      if(match.step === MatchStep.Group){
        if(!accumulater[match.step][match.round]){
          accumulater[match.step][match.round] = {}
        }
        if(match.groupOrder === undefined) return accumulater
        if(!accumulater[match.step][match.round][MAP_GROUP_NAME[match.groupOrder].NAME]){
          accumulater[match.step][match.round][MAP_GROUP_NAME[match.groupOrder].NAME] = []
        }
        accumulater[match.step][match.round][MAP_GROUP_NAME[match.groupOrder].NAME].push('match')
      }else if(match.step === MatchStep.PlayOff){
        if(!accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]]){
          accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]] = []
        }
        accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]].push('match')
      }
      return accumulater

    }, {})
    setMatchInIterationFormat(iteratableMatch)
    console.log(JSON.stringify(iteratableMatch, null, 1))
  }

  useEffect(() => {
    if(tournament){
      getMatches(tournament.events[tabIndex].id)
    }
  }, [tournament])

  useEffect(() => {
    if(!tournament) return
    const eventID = tournament.events[tabIndex].id
    getMatches(eventID)
  }, [tabIndex])


  useEffect(() => {
    if(user && tournament && tournament.managers?.map((m) => m.id)?.includes(user?.player.id)){
      setIsManager(true)
    }else{
      setIsManager(false)
    }
  }, [user, tournament])

  useEffect(() => {
    generateTimeSlots(matchDuration)
  }, [matchDuration, numCourt])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue)
  }

  // const generateTimeSlots = (stepMinutes: number): string[][] => {
  //   const slots: string[][] = []
  //   const totalMinutes = 24 * 60 // full day

  //   for (let m = 0; m < totalMinutes; m += stepMinutes) {
  //     const hours = Math.floor(m / 60)
  //     const minutes = m % 60
  //     slots.push(
  //       [`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  //         , ...Array.from({ length:numCourt }, (_, i) => `Court ${(i + 1)}`)]
  //     )
  //   }

  //   return slots
  // }

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

    if(!a.round || !b.round) return 0


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

    if(!a.groupOrder || !b.groupOrder) return 0

    return a.groupOrder - b.groupOrder

  }

  const renderTableCell = (match: (Match | null | string)) => {
    if (typeof match === 'string'){
      return match
    }else if(match === null){
      return <AddCircle/>
    }else {
      if(match.round === undefined || match.groupOrder === undefined) return
      return (
        <Box>
          <Typography>Group {MAP_GROUP_NAME[match.groupOrder].NAME}</Typography>
          <Typography>Round {match.round + 1}</Typography>
        </Box>
      )
    }
  }

  const generateTimeSlots = (
    stepMinutes: number,
    startHour = 9,
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
    newDay: number,
  ) => {
    setSelectedDay(newDay)
  }

  const onAddMatchToSchedule = () => {
    const groupStageMatches: Match[] = eventMatches.filter((m: Match) => m.step === MatchStep.Group)
    const tempTableRowData = [...tableRowData]
    let tempCourt = selectedCourt
    let tempTimeSlot = selectedTimeSlot
    let currentRound = 0
    while(groupStageMatches.length > 0){
      if(groupStageMatches[0].round === currentRound){
        if(tempTableRowData[tempTimeSlot][tempCourt] !== null){
          tempCourt++
          continue
        }
        tempTableRowData[tempTimeSlot][tempCourt] = groupStageMatches.shift() ?? 'no match'
        tempCourt++
        if(tempCourt > numCourt){
          tempCourt = 1
          tempTimeSlot++
        }
      }else {
        currentRound = groupStageMatches[0].round ?? -1
        tempCourt = selectedCourt
        tempTableRowData[tempTimeSlot += 2][tempCourt] = groupStageMatches.shift() ?? 'no match'
        console.log('new round')
      }
    }

    setTableRowData(tempTableRowData)
  }

  // const onAddMatchToSchedule = (obj: unknown, key: string, timeSlot:number, court: number) => {
  //   console.log('obj', obj)
  //   console.log('key', key)
  //   if(Array.isArray(obj[key])){
  //     console.log('is array')
  //     const teamArray = [...obj[key]]
  //     const tempTableRowData = [...tableRowData]
  //     while(teamArray.length > 0){
  //       if(tempTableRowData[timeSlot][court] === null){
  //         tempTableRowData[timeSlot][court] = teamArray.shift()
  //         court++
  //         if(court >= numCourt){
  //           timeSlot++
  //           court = 0
  //         }
  //       }
  //     }
  //     console.log(tempTableRowData[timeSlot])
  //     setTableRowData(tempTableRowData)
  //     return
  //   }
  //   Object.entries(obj[key]).map(([objKey, objValue ]) => {
  //     console.log('objKey', objKey)
  //     console.log('objValue', objValue)
  //     if(Array.isArray(objValue)){
  //       console.log('is array')
  //       const teamArray = [...objValue]
  //       const tempTableRowData = [...tableRowData]
  //       while(teamArray.length > 0){
  //         if(tempTableRowData[timeSlot][court] === null){
  //           tempTableRowData[timeSlot][court] = teamArray.shift()
  //           court++
  //           if(court >= numCourt){
  //             timeSlot++
  //             court = 0
  //           }
  //         }
  //       }
  //       // setTableRowData(tempTableRowData)
  //     }else{
  //       Object.entries(objValue).map(([nestedObjKey, nestedObjValue]) => {
  //         console.log('----------------')
  //         console.log(nestedObjKey, nestedObjValue)
  //         onAddMatchToSchedule(objValue, nestedObjKey, timeSlot, court)

  //       })
  //     }
  //   })
  // }

  if(!tournament) return

  return (
    <TournamentLayout isManager={isManager}>
      <Box sx={{ display: 'flex' }}>
        <MenuDrawer tournamentID={tournament.id}/>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display:'flex', gap:2, margin: 1, pt:2 }}>
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
            <Button sx={{ borderRadius: 10, width:'100px' }} color='error' variant='contained' size='large'>Reset</Button>
            <Button sx={{ borderRadius: 10, width:'100px'  }} color='primary' variant='contained' size='large'>Auto</Button>
            <Button sx={{ borderRadius: 10, width:'100px'  }} color='primary' variant='contained' size='large'>Save</Button>
          </Box>
          <ToggleButtonGroup aria-label="Basic button group" value={selectedDay} onChange={onChangeDay} exclusive>
            {getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d, i) => <ToggleButton key={`day-${i}`} value={i}>{moment(d).format('ddd, DD.MM')}</ToggleButton>)}
          </ToggleButtonGroup>
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
          <Box component="main" sx={{ flexGrow: 1, p: 2, pt:0 }}>
            {tournament.events.map(((event, idx) => {
              return (
                <TabPanel value={tabIndex} index={idx} key={event.id} >
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
                  </Accordion>
                </TabPanel>
              )
            }))}
          </Box>
          <TableContainer component={Paper} sx={{ maxWidth: '100%', maxHeight: 500 }} >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {
                    ['เวลา/คอร์ด', ...Array.from({ length:numCourt }, (_, i) => `Court ${(i + 1)}`)].map((court) => <TableCell key={`court-${court}`}>{court}</TableCell>)
                  }
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  tableRowData.map((timeSlot, i) => (
                    <TableRow key={`timeSlot-${i}`}>
                      {
                        timeSlot.map((match, j) => (
                          <TableCell key={`match-${j}`}>
                            <Button onClick={(e:MouseEvent<HTMLButtonElement>) => onSelectCell(e, i, j)}>
                              {renderTableCell(match)}
                            </Button>
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
        <Box sx={{ p:3, minWidth: 300 }}>
          {Object.entries(matchInIterationFormat).map(([key, value]) => {
            return (
              <Button key={`step-${key}`} onClick={() => onAddMatchToSchedule()}>{key}</Button>
              // <Button key={`step-${key}`} onClick={() => onAddMatchToSchedule(matchInIterationFormat, key, selectedTimeSlot, selectedCourt)}>{key}</Button>
            )
          })}
        </Box>
        {/* <List
          sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
          component="nav"
          aria-labelledby="nested-list-subheader"
        >
          {Object.entries(matchInIterationFormat).map(([stepKey, step]) => (
            <>
              <ListItemButton key={`step-${stepKey}`} onClick={() => handleClickList(`step-${stepKey}`)}>
                <ListItemText primary={stepKey} />
                {openNestedList[`step-${stepKey}`] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={openNestedList[`step-${stepKey}`]} timeout="auto" unmountOnExit>
                <List>
                  {Object.entries(step).map(([roundKey, round]) => (
                    <>
                      <ListItemButton key={`step-${stepKey}-round-${roundKey}`} onClick={() => handleClickList(`step-${stepKey}-round-${roundKey}`)}>
                        <ListItemText primary={roundKey} />
                        {openNestedList[`step-${stepKey}-round-${roundKey}`] ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                      <Collapse in={openNestedList[`step-${stepKey}`]} timeout="auto" unmountOnExit>
                        <List>
                          {Object.entries(round).map(([groupKey, group]) => (
                            <ListItemButton key={`step-${stepKey}-round-${roundKey}-group-${groupKey}`} onClick={() => handleClickList(`step-${stepKey}-round-${roundKey}-group-${groupKey}`)}>
                              <ListItemText primary={groupKey} />
                              {openNestedList[`step-${stepKey}-round-${roundKey}-group-${groupKey}`] ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                          ))}
                        </List>
                      </Collapse>
                    </>
                  ))}
                </List>
              </Collapse>
            </>
          ))}
        </List> */}
      </Popover>
    </TournamentLayout>
  )

}
export default Organizer