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
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Popover, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import axios from 'axios'
import { useParams } from 'next/navigation'
import React, { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import MenuDrawer from '../MenuDrawer'
import moment from 'moment'
import { useTournament } from '@/app/libs/data'
import { AddCircle, ArrowBackIos } from '@mui/icons-material'




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
  consolation: Playoff;
}

type ScheduleCell = Match | null | string
type ScheduleTable = ScheduleCell[][]

const Organizer = () => {
  const TIME_ZONE_OPTIONS = [
    'UTC',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Los_Angeles',
  ]

  const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const availableTimeZones = TIME_ZONE_OPTIONS.includes(detectedTimeZone)
    ? TIME_ZONE_OPTIONS
    : [detectedTimeZone, ...TIME_ZONE_OPTIONS]

  // const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const params = useParams()
  const dispatch = useAppDispatch()
  const [numCourt, setNumCourt] = useState(8)
  const [startTime, setStartTime] = useState(9)
  const [matchDuration, setMatchDuration] = useState(25)
  const [selectedDay, setSelectedDay] = useState<string|null>(null)
  const [eventOrder, setEventOrder] = useState<string[]>([])
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [tableRowData, setTableRowData ] = useState<ScheduleTable>([])
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, ScheduleTable>>({})
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(-1)
  const [selectedCourt, setSelectedCourt] = useState(-1)
  const { tournament } = useTournament(params.id as string)

  const [tableRowDataHistory, setTableRowDataHistory] = useState<ScheduleTable[]>([])
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false)
  const [manualMatchByEvent, setManualMatchByEvent] = useState<Record<string, MatchData>>({})
  const [selectedManualEventID, setSelectedManualEventID] = useState<string | null>(null)

  const [step, setStep] = useState<string | null>(null)
  const [group, setGroup] = useState<string | null>(null)
  const [round, setRound] = useState<string | null>(null)
  const [selectedTimeZone, setSelectedTimeZone] = useState(detectedTimeZone)

  const [dragSource, setDragSource] = useState<{ slot: number; court: number } | null>(null)
  const [pendingDrop, setPendingDrop] = useState<{
    sourceSlot: number
    sourceCourt: number
    targetSlot: number
    targetCourt: number
  } | null>(null)

  const open = Boolean(anchorEl)
  const handleClose = () => {
    setAnchorEl(null)
    setSelectedManualEventID(null)
    setStep(null)
    setGroup(null)
    setRound(null)
  }

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
  }, [dispatch])

  const createEmptyScheduleTable = useCallback((
    stepMinutes: number,
    startHour = 5,
    startMinute = 0,
    endHour = 24,
    endMinute = 30,
    courts = numCourt
  ): ScheduleTable => {
    const slots: ScheduleTable = []
    const totalMinutes = endHour * 60 + endMinute
    let currentMinutes = startHour * 60 + startMinute

    while (currentMinutes <= totalMinutes) {
      const hours = Math.floor(currentMinutes / 60)
      const minutes = currentMinutes % 60
      slots.push(
        [`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
          , ...Array.from({ length:courts }, () => null)]
      )
      currentMinutes += stepMinutes
    }
    return slots
  }, [numCourt])

  const formatMatchIteration = useCallback((matches: Match[]) => {
    return matches.reduce((prev: MatchData, match:Match) => {
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
      }else if(match.step === MatchStep.PlayOff || match.step === MatchStep.Consolation){
        accumulater[MatchStep.PlayOff] = { ...accumulater[MatchStep.PlayOff] }
        accumulater[match.step] = { ...accumulater[match.step] }
        if(!accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]]){
          accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]] = []
        }
        accumulater[match.step][MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]].push(match)
      }
      return accumulater

    }, { group: {}, playoff: {}, consolation: {} })
  }, [])

  const getManualMatchesByEvent = useCallback(async(events: TournamentEvent[]) => {
    const responses = await Promise.all(
      events.map((event) => axios.get(`${SERVICE_ENDPOINT}/matches?eventID=${event.id}&status=waiting`))
    )

    const nextManualMatchByEvent = events.reduce((acc, event, index) => {
      const waitingMatches = responses[index]?.data ?? []
      acc[event.id] = formatMatchIteration(waitingMatches)
      return acc
    }, {} as Record<string, MatchData>)

    setManualMatchByEvent(nextManualMatchByEvent)
  }, [formatMatchIteration])

  const getDaysArray = useCallback((startDate: Date, endDate: Date): Date[] => {
    const days: Date[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      days.push(new Date(current)) // clone, don’t push reference
      current.setDate(current.getDate() + 1)
    }

    return days
  }, [])

  const populateScheduleWithExistingMatches = useCallback((
    nextScheduleByDay: Record<string, ScheduleTable>,
    matches: Match[]
  ): Record<string, ScheduleTable> => {
    const getDateStringInTimeZone = (value: string | Date) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: selectedTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    }

    const getTimeStringInTimeZone = (value: string | Date) => {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: selectedTimeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    }

    const updatedSchedules = { ...nextScheduleByDay }

    matches.forEach((match) => {
      if (!match.date) return

      const matchDayStr = getDateStringInTimeZone(match.date)
      const timeStr = getTimeStringInTimeZone(match.date)

      const dayKey = Object.keys(updatedSchedules).find(
        (key) => getDateStringInTimeZone(key) === matchDayStr
      )
      if (!dayKey) return

      const schedule = updatedSchedules[dayKey]
      const timeSlotIndex = schedule.findIndex((slot) => slot[0] === timeStr)

      if (timeSlotIndex === -1) return

      const courtIndex = parseInt(match.court || '0')
      if (courtIndex >= 0 && courtIndex < schedule[timeSlotIndex].length - 1) {
        schedule[timeSlotIndex][courtIndex + 1] = match
      }
    })

    return updatedSchedules
  }, [selectedTimeZone])

  const getTimeZoneOffsetMinutes = useCallback((date: Date, timeZone: string): number => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(date).reduce((acc, part) => {
      if(part.type !== 'literal'){
        acc[part.type] = part.value
      }
      return acc
    }, {} as Record<string, string>)

    const interpretedAsUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    )

    return (interpretedAsUTC - date.getTime()) / 60000
  }, [])

  const getDatePartsInTimeZone = useCallback((value: string, timeZone: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const parts = formatter.formatToParts(new Date(value)).reduce((acc, part) => {
      if(part.type !== 'literal'){
        acc[part.type] = part.value
      }
      return acc
    }, {} as Record<string, string>)

    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
    }
  }, [])

  const buildISODateForTimeZone = useCallback((dayISO: string, timeText: string, timeZone: string) => {
    const [hoursText, minutesText] = timeText.split(':')
    const hour = Number(hoursText)
    const minute = Number(minutesText)
    const { year, month, day } = getDatePartsInTimeZone(dayISO, timeZone)

    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
    const firstOffset = getTimeZoneOffsetMinutes(utcGuess, timeZone)
    let utcDate = new Date(utcGuess.getTime() - firstOffset * 60000)

    const secondOffset = getTimeZoneOffsetMinutes(utcDate, timeZone)
    if(secondOffset !== firstOffset){
      utcDate = new Date(utcGuess.getTime() - secondOffset * 60000)
    }

    return utcDate.toISOString()
  }, [getDatePartsInTimeZone, getTimeZoneOffsetMinutes])

  const onGenerateMatches = async() => {
    if(!tournament) return

    setIsGeneratingMatches(true)
    try {
      const generatedResponse = await axios.post(
        `${SERVICE_ENDPOINT}/events/generate-matches`,
        { tournamentID: tournament.id },
        { withCredentials: true }
      )
      let generatedMatchList = Array.isArray(generatedResponse.data) ? generatedResponse.data as Match[] : []

      // Fallback: if response is empty, fetch freshly created matches
      if(generatedMatchList.length < 1){
        const responses = await Promise.all(
          tournament.events.map((event) =>
            axios.get(`${SERVICE_ENDPOINT}/matches?eventID=${event.id}`, { withCredentials: true })
          )
        )
        generatedMatchList = responses.flatMap((response) => response.data ?? []) as Match[]
      }

      // Populate manual match picker with generated matches
      await getManualMatchesByEvent(tournament.events)

      // Populate schedule grid with any pre-dated matches
      const days = getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d) => d.toISOString())
      const firstDay = days[0]
      const nextScheduleByDay = days.reduce((acc, day) => {
        acc[day] = createEmptyScheduleTable(matchDuration, startTime)
        return acc
      }, {} as Record<string, ScheduleTable>)
      const populatedScheduleByDay = populateScheduleWithExistingMatches(
        nextScheduleByDay,
        generatedMatchList.filter((match) => Boolean(match.date))
      )
      setScheduleByDay(populatedScheduleByDay)
      setSelectedDay(firstDay)
      setTableRowData(populatedScheduleByDay[firstDay] ?? [])
      setTableRowDataHistory([])
    } catch (error) {
      if(axios.isAxiosError(error)){
        const message = (error.response?.data as { message?: string } | undefined)?.message
        window.alert(message || 'Failed to generate matches')
      } else {
        window.alert('Failed to generate matches')
      }
    } finally {
      setIsGeneratingMatches(false)
    }
  }

  useEffect(() => {
    if(tournament){
      getManualMatchesByEvent(tournament.events)
      const days = getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d) => d.toISOString())
      const firstDay = days[0]
      const nextScheduleByDay = days.reduce((acc, day) => {
        acc[day] = createEmptyScheduleTable(matchDuration, startTime)
        return acc
      }, {} as Record<string, ScheduleTable>)

      // Load scheduled matches for ALL events
      const loadScheduledMatches = async(): Promise<void> => {
        try {
          const responses = await Promise.all(
            tournament.events.map((event) =>
              axios.get(`${SERVICE_ENDPOINT}/matches?eventID=${event.id}`, { withCredentials: true })
            )
          )
          const allMatches = responses.flatMap((res) => res.data || [])
          const scheduledMatches = allMatches.filter((match: Match) => match.date)

          const populatedSchedule = scheduledMatches.length > 0
            ? populateScheduleWithExistingMatches(nextScheduleByDay, scheduledMatches)
            : nextScheduleByDay

          setScheduleByDay(populatedSchedule)
          setTableRowData(populatedSchedule[firstDay] ?? [])
        } catch (error) {
          console.error('Failed to load scheduled matches:', error)
          setScheduleByDay(nextScheduleByDay)
          setTableRowData(nextScheduleByDay[firstDay] ?? [])
        }
      }

      setEventOrder(tournament.events.map((event) => event.id))
      setSelectedDay(firstDay)
      setTableRowDataHistory([])

      loadScheduledMatches()
    }
  }, [tournament, getManualMatchesByEvent, getDaysArray, createEmptyScheduleTable, matchDuration, startTime, populateScheduleWithExistingMatches])

  useEffect(() => {
    if(!tournament) return
    const days = getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d) => d.toISOString())
    const firstDay = days[0]
    const nextScheduleByDay = days.reduce((acc, day) => {
      acc[day] = createEmptyScheduleTable(matchDuration, startTime)
      return acc
    }, {} as Record<string, ScheduleTable>)

    // Load scheduled matches for ALL events
    const loadScheduledMatches = async(): Promise<void> => {
      try {
        const responses = await Promise.all(
          tournament.events.map((event) =>
            axios.get(`${SERVICE_ENDPOINT}/matches?eventID=${event.id}`, { withCredentials: true })
          )
        )
        const allMatches = responses.flatMap((res) => res.data || [])
        const scheduledMatches = allMatches.filter((match: Match) => match.date)

        const populatedSchedule = scheduledMatches.length > 0
          ? populateScheduleWithExistingMatches(nextScheduleByDay, scheduledMatches)
          : nextScheduleByDay

        setScheduleByDay(populatedSchedule)
        setTableRowData(populatedSchedule[firstDay] ?? [])
      } catch (error) {
        console.error('Failed to load scheduled matches:', error)
        setScheduleByDay(nextScheduleByDay)
        setTableRowData(nextScheduleByDay[firstDay] ?? [])
      }
    }

    setSelectedDay(firstDay)
    setTableRowDataHistory([])
    loadScheduledMatches()
  }, [matchDuration, numCourt, startTime, tournament, getDaysArray, createEmptyScheduleTable, populateScheduleWithExistingMatches])

  const onSelectCell = (e:MouseEvent<HTMLButtonElement>, timeSlot:number, court:number) => {
    setAnchorEl(e.currentTarget)
    setSelectedManualEventID(null)
    setStep(null)
    setGroup(null)
    setRound(null)
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
    } else if (a.step === MatchStep.PlayOff || a.step === MatchStep.Consolation) {
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

  const getPlayerDisplayName = (player: Match['teamA']['players'][number]): string => {
    return (
      player.officialName?.[language]
      || player.displayName?.[language]
      || player.officialName?.th
      || player.officialName?.en
      || player.displayName?.th
      || player.displayName?.en
      || 'Unknown'
    )
  }

  const getTeamDisplayName = (team: Match['teamA']): string => {
    if(!team?.players || team.players.length < 1) return 'TBD'
    return team.players.map((player) => getPlayerDisplayName(player).split(' ')[0]).join(' / ')
  }

  const onDragStart = (e: React.DragEvent<HTMLButtonElement>, slotIndex: number, courtIndex: number) => {
    setDragSource({ slot: slotIndex, court: courtIndex })
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const applyDropAction = useCallback((
    sourceSlot: number,
    sourceCourt: number,
    targetSlot: number,
    targetCourt: number,
    action: 'swap' | 'insert'
  ) => {
    const tempHistory = [...tableRowDataHistory]
    const deepCopyTableRowData = JSON.parse(JSON.stringify(tableRowData))
    tempHistory.push(deepCopyTableRowData)
    setTableRowDataHistory(tempHistory)

    const tempTableRowData = tableRowData.map((row) => [...row])
    const sourceMatch = tempTableRowData[sourceSlot][sourceCourt]
    const targetCell = tempTableRowData[targetSlot][targetCourt]

    if(sourceMatch === null || typeof sourceMatch === 'string') return

    if(targetCell === null){
      tempTableRowData[targetSlot][targetCourt] = sourceMatch
      tempTableRowData[sourceSlot][sourceCourt] = null
    }else if(typeof targetCell !== 'string'){
      if(action === 'swap'){
        tempTableRowData[sourceSlot][sourceCourt] = targetCell
        tempTableRowData[targetSlot][targetCourt] = sourceMatch
      }else{
        const schedulePositions: Array<{ slot: number, court: number }> = []
        for(let slot = 0; slot < tempTableRowData.length; slot++){
          for(let court = 1; court < tempTableRowData[slot].length; court++){
            schedulePositions.push({ slot, court })
          }
        }

        const linearValues = schedulePositions.map(({ slot, court }) => tempTableRowData[slot][court])
        const sourceLinearIndex = schedulePositions.findIndex(({ slot, court }) => slot === sourceSlot && court === sourceCourt)
        const targetLinearIndex = schedulePositions.findIndex(({ slot, court }) => slot === targetSlot && court === targetCourt)

        if(sourceLinearIndex !== -1 && targetLinearIndex !== -1){
          const valuesWithoutSource = [...linearValues]
          const [removedValue] = valuesWithoutSource.splice(sourceLinearIndex, 1)
          const adjustedTargetIndex = sourceLinearIndex < targetLinearIndex ? targetLinearIndex - 1 : targetLinearIndex
          valuesWithoutSource.splice(adjustedTargetIndex, 0, removedValue)

          schedulePositions.forEach(({ slot, court }, index) => {
            tempTableRowData[slot][court] = valuesWithoutSource[index] ?? null
          })
        }
      }
    }

    setTableRowData(tempTableRowData)
    if(selectedDay){
      setScheduleByDay({
        ...scheduleByDay,
        [selectedDay]: tempTableRowData,
      })
    }
  }, [scheduleByDay, selectedDay, tableRowData, tableRowDataHistory])

  const onDropMatch = (e: React.DragEvent<HTMLElement>, targetSlot: number, targetCourt: number) => {
    e.preventDefault()
    if(!dragSource) return

    const sourceSlot = dragSource.slot
    const sourceCourt = dragSource.court

    if(sourceSlot === targetSlot && sourceCourt === targetCourt) {
      setDragSource(null)
      return
    }

    const sourceMatch = tableRowData[sourceSlot][sourceCourt]
    const targetCell = tableRowData[targetSlot][targetCourt]

    if(sourceMatch !== null && typeof sourceMatch !== 'string'){
      if(targetCell !== null && typeof targetCell !== 'string'){
        setPendingDrop({ sourceSlot, sourceCourt, targetSlot, targetCourt })
      }else{
        applyDropAction(sourceSlot, sourceCourt, targetSlot, targetCourt, 'swap')
      }
    }

    setDragSource(null)
  }

  const onCloseDropActionDialog = () => {
    setPendingDrop(null)
  }

  const onSelectDropAction = (action: 'swap' | 'insert') => {
    if(!pendingDrop) return

    applyDropAction(
      pendingDrop.sourceSlot,
      pendingDrop.sourceCourt,
      pendingDrop.targetSlot,
      pendingDrop.targetCourt,
      action
    )
    setPendingDrop(null)
  }

  const EVENT_COLORS: Record<string, string[]> = {
    group: [
      '#a0826d',
      '#6a9ab0',
      '#7aaa65',
      '#a06aaa',
      '#b08a5a',
      '#5aacac',
      '#b05a6a',
      '#6a9a5a',
    ],
    playoff: [
      '#c0603a',
      '#3a60c0',
      '#3aaa3a',
      '#c03a80',
      '#c0903a',
      '#3aaaaa',
      '#c03a3a',
      '#3a803a',
    ],
    consolation: [
      '#b8a090',
      '#90aab8',
      '#a0c090',
      '#b890c0',
      '#c0b090',
      '#90c0c0',
      '#c090a0',
      '#90b090',
    ],
  }

  const getEventColor = (eventID: string | undefined, step: string | undefined): string => {
    const palette = EVENT_COLORS[step ?? 'group'] ?? EVENT_COLORS.group
    if (!eventID) return palette[0]
    const index = eventOrder.indexOf(eventID)
    return palette[index >= 0 ? index % palette.length : 0]
  }

  const displayEventOrder = eventOrder.length > 0
    ? eventOrder
    : (tournament?.events.map((event) => event.id) ?? [])

  const matchStatistics = useMemo(() => {
    if(!tournament) return null

    const uniqueMatches = new Map<string, Match>()

    Object.values(scheduleByDay).forEach((daySchedule) => {
      daySchedule.forEach((timeSlot) => {
        timeSlot.forEach((cell) => {
          if(cell && typeof cell !== 'string'){
            uniqueMatches.set(cell.id, cell)
          }
        })
      })
    })

    Object.values(manualMatchByEvent).forEach((eventMatchData) => {
      Object.values(eventMatchData.group).forEach((groupRounds) => {
        Object.values(groupRounds).forEach((matches) => {
          matches.forEach((match) => uniqueMatches.set(match.id, match))
        })
      })

      Object.values(eventMatchData.playoff).forEach((matches) => {
        matches.forEach((match) => uniqueMatches.set(match.id, match))
      })

      Object.values(eventMatchData.consolation).forEach((matches) => {
        matches.forEach((match) => uniqueMatches.set(match.id, match))
      })
    })

    const byStep = {
      group: 0,
      playoff: 0,
      consolation: 0,
    }

    const byEvent = tournament.events.reduce((acc, event) => {
      acc[event.id] = {
        id: event.id,
        name: event.name?.[language] || event.name?.th || event.name?.en || 'Unknown event',
        total: 0,
        group: 0,
        playoff: 0,
        consolation: 0,
      }
      return acc
    }, {} as Record<string, { id: string; name: string; total: number; group: number; playoff: number; consolation: number }>)

    uniqueMatches.forEach((match) => {
      const eventID = match.event?.id
      if(!eventID) return

      if(!byEvent[eventID]){
        byEvent[eventID] = {
          id: eventID,
          name: match.event?.name?.[language] || match.event?.name?.th || match.event?.name?.en || 'Unknown event',
          total: 0,
          group: 0,
          playoff: 0,
          consolation: 0,
        }
      }

      byEvent[eventID].total += 1
      if(match.step === MatchStep.Group){
        byEvent[eventID].group += 1
        byStep.group += 1
      }else if(match.step === MatchStep.PlayOff){
        byEvent[eventID].playoff += 1
        byStep.playoff += 1
      }else if(match.step === MatchStep.Consolation){
        byEvent[eventID].consolation += 1
        byStep.consolation += 1
      }
    })

    return {
      total: uniqueMatches.size,
      byStep,
      byEvent,
    }
  }, [language, manualMatchByEvent, scheduleByDay, tournament])

  const renderTableCell = (match: (Match | null | string), i: number, j: number) => {
    if (typeof match === 'string'){
      return <Box sx={{ width: '100%', textAlign: 'center' }}>{match}</Box>
    }else if(match === null){
      return (
        <Box
          onDragOver={onDragOver}
          onDrop={(e) => onDropMatch(e, i, j)}
          sx={{ width: '100%', cursor: dragSource ? 'grab' : 'pointer', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Button fullWidth onClick={(e:MouseEvent<HTMLButtonElement>) => onSelectCell(e, i, j)}><AddCircle/></Button>
        </Box>
      )
    }else {
      if(match.round === undefined) return

      return (
        <Button
          fullWidth
          draggable
          onDragStart={(e) => onDragStart(e, i, j)}
          onClick={(e:MouseEvent<HTMLButtonElement>) => onSelectCell(e, i, j)}
          sx={{
            width: '100%',
            p: 0,
            borderRadius: 1,
            overflow: 'hidden',
            textTransform: 'none',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            display: 'block',
            border: '1px solid #c0c0c8',
          }}
        >
          <Box sx={{ width: '100%' }}>
            <Box
              sx={{
                backgroundColor: getEventColor(match.event?.id, match.step),
                color: 'whitesmoke',
                px: 1,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography variant='caption' sx={{ textAlign: 'left', fontWeight: 600, lineHeight: 1.2 }}>
                {match.event?.name?.[language]}
              </Typography>
              <Typography variant='caption' sx={{ whiteSpace: 'nowrap' }}>
                {match.step === MatchStep.Group
                  ? `Group ${MAP_GROUP_NAME[match.groupOrder as number].NAME} - R${match.round + 1}`
                  : match.step === MatchStep.Consolation
                    ? `Con. ${MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]}`
                    : MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]
                }
              </Typography>
            </Box>
            <Box sx={{ backgroundColor: '#fff' }}>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderBottom: '1px solid #f0f0f0',
                  textAlign: 'left',
                }}
              >
                <Typography variant='caption' sx={{ display: 'block', color: '#777', lineHeight: 1.2 }}>
                  {getTeamDisplayName(match.teamA)}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  textAlign: 'left',
                }}
              >
                <Typography variant='caption' sx={{ display: 'block', color: '#777', lineHeight: 1.2 }}>
                  {getTeamDisplayName(match.teamB)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Button>
      )
    }
  }

  const onSaveSchedule = async() => {
    const selectedDaySchedule = selectedDay ? { [selectedDay]: tableRowData } : {}
    const schedules = { ...scheduleByDay, ...selectedDaySchedule }
    const matches = Object.entries(schedules).reduce((allDayAccumulator: {id: string, date: string, court: string}[], [day, schedule]) => {
      const dayMatches = schedule.reduce((accumulator: {id: string, date: string, court: string}[], currentTimeSlot: ScheduleCell[]) => {

        for(let i = 1;i < currentTimeSlot.length; i++){
          if(typeof currentTimeSlot[i] === 'string' || currentTimeSlot[i] === null) {
            continue
          }

          const date = moment(day)
            .toISOString()
          const zonedDate = buildISODateForTimeZone(
            date,
            currentTimeSlot[0]?.toString() || '00:00',
            selectedTimeZone
          )
          const match: Match = currentTimeSlot[i] as Match
          const court = (i - 1).toString()

          accumulator.push({ id: match.id, date: zonedDate, court })
        }
        return accumulator
      }, [])
      allDayAccumulator.push(...dayMatches)
      return allDayAccumulator
    }, [])


    await axios.post(`${SERVICE_ENDPOINT}/matches/schedule`, {
      tournamentID: tournament.id,
      matches,
    }, { withCredentials:true })

    // Generate match numbers after saving schedule
    await axios.post(`${SERVICE_ENDPOINT}/matches/assign-match-number`,
      { tournamentID: tournament.id },
      { withCredentials:true }
    )
  }

  const resetAllDaySchedules = () => {
    if(!tournament) return
    const days = getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d) => d.toISOString())
    const nextScheduleByDay = days.reduce((acc, day) => {
      acc[day] = createEmptyScheduleTable(matchDuration, startTime)
      return acc
    }, {} as Record<string, ScheduleTable>)

    setScheduleByDay(nextScheduleByDay)
    if(selectedDay){
      setTableRowData(nextScheduleByDay[selectedDay] ?? [])
    }
    setTableRowDataHistory([])
  }

  const onChangeDay = (
    event: React.MouseEvent<HTMLElement>,
    newDay: string,
  ) => {
    if(!newDay) return
    const nextScheduleByDay = { ...scheduleByDay }
    if(selectedDay){
      nextScheduleByDay[selectedDay] = tableRowData
    }
    if(!nextScheduleByDay[newDay]){
      nextScheduleByDay[newDay] = createEmptyScheduleTable(matchDuration, startTime)
    }
    setScheduleByDay(nextScheduleByDay)
    setSelectedDay(newDay)
    setTableRowData(nextScheduleByDay[newDay])
    setTableRowDataHistory([])
  }

  const moveEventOrder = (eventID: string, direction: 'up' | 'down') => {
    const currentIndex = eventOrder.findIndex((id) => id === eventID)
    if(currentIndex < 0) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if(targetIndex < 0 || targetIndex >= eventOrder.length) return

    const nextOrder = [...eventOrder]
    const [current] = nextOrder.splice(currentIndex, 1)
    nextOrder.splice(targetIndex, 0, current)
    setEventOrder(nextOrder)
  }

  const getMatchTeamIDs = (match: Match): string[] => {
    const ids: string[] = []
    if(match.teamA?.id) ids.push(match.teamA.id)
    if(match.teamB?.id) ids.push(match.teamB.id)
    return ids
  }

  const isMatchAvailableForSlot = (match: Match, slot: number, teamNextAvailableSlot: Record<string, number>): boolean => {
    const teamIDs = getMatchTeamIDs(match)
    return teamIDs.every((teamID) => {
      const earliestSlot = teamNextAvailableSlot[teamID] ?? 0
      return earliestSlot <= slot
    })
  }

  const findNextEmptyPosition = (table: ScheduleTable, startSlot: number, startCourt: number) => {
    let slot = startSlot
    let court = startCourt

    while (slot < table.length) {
      while (court <= numCourt) {
        if(table[slot][court] === null){
          return { slot, court }
        }
        court++
      }
      slot++
      court = 1
    }

    return null
  }

  const onAutoScheduleTwoDays = async() => {
    if(!tournament) return

    const days = getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d) => d.toISOString())
    if(days.length < 2){
      window.alert('Auto schedule needs at least 2 tournament days')
      return
    }

    const waitingMatchesResponse = await axios.get(`${SERVICE_ENDPOINT}/matches?tournamentID=${tournament.id}&status=waiting`)
    const waitingMatches = waitingMatchesResponse.data as Match[]
    const matchByEvent = waitingMatches.reduce((acc, match) => {
      const eventID = match.event?.id
      if(!eventID) return acc
      if(!acc[eventID]){
        acc[eventID] = []
      }
      acc[eventID].push(match)
      return acc
    }, {} as Record<string, Match[]>)

    const orderedEventIDs = eventOrder.length > 0 ? eventOrder : tournament.events.map((event) => event.id)
    const dayOneTable = createEmptyScheduleTable(matchDuration, startTime)
    const dayTwoTable = createEmptyScheduleTable(matchDuration, startTime)

    const groupStates = orderedEventIDs.flatMap((eventID) => {
      const eventGroupMatches = (matchByEvent[eventID] ?? [])
        .filter((match) => match.step === MatchStep.Group && match.groupOrder !== undefined && match.round !== undefined)

      const groups: Record<number, Record<number, Match[]>> = {}
      for(const match of eventGroupMatches){
        const groupOrder = match.groupOrder as number
        const round = match.round as number
        if(!groups[groupOrder]){
          groups[groupOrder] = {}
        }
        if(!groups[groupOrder][round]){
          groups[groupOrder][round] = []
        }
        groups[groupOrder][round].push(match)
      }

      return Object.keys(groups)
        .map((groupOrder) => Number(groupOrder))
        .sort((a, b) => a - b)
        .map((groupOrder) => {
          const rounds = Object.keys(groups[groupOrder])
            .map((round) => Number(round))
            .sort((a, b) => a - b)
            .map((round) => groups[groupOrder][round].sort((a, b) => {
              if(a.bracketOrder === undefined || b.bracketOrder === undefined) return 0
              return a.bracketOrder - b.bracketOrder
            }))

          return {
            rounds,
            roundCursor: 0,
            nextAvailableSlot: 0,
            hasStarted: false,
            lastScheduledSlot: -1,
          }
        })
    })

    const teamNextAvailableSlot: Record<string, number> = {}
    for(let slot = 0; slot < dayOneTable.length; slot++){
      const remainingCourts = Array.from({ length:numCourt }, (_, i) => i + 1)
      if(groupStates.length < 1) break

      const blockedGroupsInSlot = new Set<number>()
      while(remainingCourts.length > 0){
        const candidates = groupStates
          .map((groupState, index) => ({ groupState, index }))
          .filter(({ groupState, index }) => (
            !blockedGroupsInSlot.has(index)
            && groupState.roundCursor < groupState.rounds.length
            && groupState.nextAvailableSlot <= slot
          ))
          .sort((a, b) => {
            if(a.groupState.hasStarted !== b.groupState.hasStarted){
              return a.groupState.hasStarted ? -1 : 1
            }

            if(a.groupState.hasStarted && b.groupState.hasStarted){
              return a.groupState.lastScheduledSlot - b.groupState.lastScheduledSlot
            }

            return a.index - b.index
          })

        if(candidates.length < 1) break

        const selected = candidates[0]
        const selectedGroupState = selected.groupState
        const currentRoundMatches = selectedGroupState.rounds[selectedGroupState.roundCursor]

        let assignedInThisGroup = 0
        while(remainingCourts.length > 0 && currentRoundMatches.length > 0){
          const matchIndex = currentRoundMatches.findIndex((match) => isMatchAvailableForSlot(match, slot, teamNextAvailableSlot))
          if(matchIndex < 0){
            break
          }

          const court = remainingCourts.shift()
          if(court === undefined) break

          const [match] = currentRoundMatches.splice(matchIndex, 1)
          if(!match) break

          dayOneTable[slot][court] = match
          const teamIDs = getMatchTeamIDs(match)
          for(const teamID of teamIDs){
            // Keep one full slot for recovery before next match.
            teamNextAvailableSlot[teamID] = slot + 2
          }

          selectedGroupState.hasStarted = true
          selectedGroupState.lastScheduledSlot = slot
          assignedInThisGroup++
        }

        if(currentRoundMatches.length < 1){
          selectedGroupState.roundCursor++
          selectedGroupState.nextAvailableSlot = slot + 2
        }

        if(assignedInThisGroup < 1){
          blockedGroupsInSlot.add(selected.index)
        }
      }
    }

    const knockoutMatches = waitingMatches.filter((match) => match.step === MatchStep.PlayOff || match.step === MatchStep.Consolation)
    const rounds = [...new Set(knockoutMatches.map((match) => match.round).filter((round): round is number => round !== undefined))].sort((a, b) => b - a)

    let knockoutSlot = 0
    let knockoutCourt = 1

    for(const roundNumber of rounds){
      for(const eventID of orderedEventIDs){
        const eventRoundMatches = knockoutMatches
          .filter((match) => match.event?.id === eventID && match.round === roundNumber)
          .sort((a, b) => {
            if(a.step !== b.step){
              return a.step === MatchStep.PlayOff ? -1 : 1
            }
            if(a.bracketOrder === undefined || b.bracketOrder === undefined) return 0
            return a.bracketOrder - b.bracketOrder
          })

        for(const match of eventRoundMatches){
          const nextPosition = findNextEmptyPosition(dayTwoTable, knockoutSlot, knockoutCourt)
          if(!nextPosition) break

          dayTwoTable[nextPosition.slot][nextPosition.court] = match
          knockoutSlot = nextPosition.slot
          knockoutCourt = nextPosition.court + 1
          if(knockoutCourt > numCourt){
            knockoutSlot++
            knockoutCourt = 1
          }
        }
      }
    }

    const nextScheduleByDay = days.reduce((acc, day, index) => {
      if(index === 0){
        acc[day] = dayOneTable
      }else if(index === 1){
        acc[day] = dayTwoTable
      }else{
        acc[day] = createEmptyScheduleTable(matchDuration, startTime)
      }
      return acc
    }, {} as Record<string, ScheduleTable>)

    setScheduleByDay(nextScheduleByDay)
    setSelectedDay(days[0])
    setTableRowData(nextScheduleByDay[days[0]] ?? [])
    setTableRowDataHistory([])
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
    if(selectedDay){
      setScheduleByDay({
        ...scheduleByDay,
        [selectedDay]: tempTableRowData,
      })
    }

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
    if(!tournament) return null

    if(!selectedManualEventID){
      return (
        <Box>
          <Typography sx={{ mb: 1, fontWeight: 600 }}>Select Event</Typography>
          {tournament.events.map((event) => {
            const eventName = event.name?.[language] || event.name?.th || event.name?.en || event.id
            return <Button key={`event-${event.id}`} onClick={() => setSelectedManualEventID(event.id)}>{eventName}</Button>
          })}
        </Box>
      )
    }

    const selectedEventMatches = manualMatchByEvent[selectedManualEventID]
    if(!selectedEventMatches || Object.values(selectedEventMatches).every((stage) => Object.keys(stage ?? {}).length < 1)){
      return (
        <Box>
          <Button key={'event-back'} onClick={() => setSelectedManualEventID(null)}><ArrowBackIos/></Button>
          <Typography>No waiting matches in this event</Typography>
        </Box>
      )
    }

    if(!step && !group && !round){
      return (
        <Box>
          <Button key={'event-back'} onClick={() => setSelectedManualEventID(null)}><ArrowBackIos/></Button>
          {Object.entries(selectedEventMatches).map(([key]) => {
            return <Button key={`step-${key}`} onClick={() => setStep(key)}>{key}</Button>
          })}
        </Box>
      )
    }

    if(step === MatchStep.PlayOff || step === MatchStep.Consolation){
      if(round){
        return (
          <Box>
            <Button key={'round-back'} onClick={() => setRound(null)}><ArrowBackIos/></Button>
            {selectedEventMatches[step][round].map((match, i) => {
              if(match.round === undefined) return
              return <Button key={`match-${match.id}`} onClick={() => onAddMatchToSchedule([match])}>{`${MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]} (${i + 1}/${selectedEventMatches[step][round].length})`}</Button>
            })}
            <Button key={'round-all'} onClick={() => onAddMatchToSchedule(selectedEventMatches[step][round])}>All</Button>
          </Box>
        )
      }else{
        return (
          <Box>
            <Button key={'round-back'} onClick={() => setStep(null)}><ArrowBackIos/></Button>
            {Object.entries(selectedEventMatches[step]).map(([key]) => {
              return <Button key={`round-${key}`} onClick={() => setRound(key)}>{key}</Button>
            })}
          </Box>
        )
      }
    }else if(step === MatchStep.Group){
      if(!group){
        return (
          <Box>
            <Button key={'step-back'} onClick={() => setStep(null)}><ArrowBackIos/></Button>
            {Object.entries(selectedEventMatches['group']).map(([key]) => {
              return (
                <Button key={`group-${key}`} onClick={() => setGroup(key)}>{key}</Button>
              )
            })}
            <Button key={'step-all'} onClick={() => onAddMatchToSchedule(getAllGroupMatches(selectedEventMatches['group']))}>All</Button>
          </Box>
        )
      }else{
        if(!round){
          return (
            <Box>
              <Button key={'round-back'} onClick={() => setGroup(null)}><ArrowBackIos/></Button>
              {Object.entries(selectedEventMatches[MatchStep.Group][group]).map(([key]) => {
                return <Button key={`round-${key}`} onClick={() => setRound(key)}>{`Round ${Number(key) + 1}`}</Button>
              })}
              <Button key={'round-all'} onClick={() => onAddMatchToSchedule(getAllMatchesFromGroup(selectedEventMatches['group'][group]))}>All</Button>
            </Box>
          )
        }
        return (
          <Box>
            <Button key={'match-back'} onClick={() => setRound(null)}><ArrowBackIos/></Button>
            {selectedEventMatches['group'][group][round].map((match, i) => {
              if(match.round === undefined) return
              return (
                <Button key={`match-${match.id}`} onClick={() => onAddMatchToSchedule([match])}>
                  {`Round ${match.round + 1} (${i + 1}/${selectedEventMatches['group'][group][round].length})`}
                </Button>
              )
            })}
            <Button key={'match-all'} onClick={() => onAddMatchToSchedule(selectedEventMatches['group'][group][round])}>All</Button>
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
    if(selectedDay){
      setScheduleByDay({
        ...scheduleByDay,
        [selectedDay]: history,
      })
    }
    setTableRowDataHistory(tempHistory)
  }

  if(!tournament) return

  return (
    <TournamentLayout tournament={tournament}>
      <Box sx={{ display: 'flex' }}>
        <MenuDrawer tournamentID={tournament.id}/>
        <Box sx={{ width: '100%' }}>
          {/* Schedule Settings Panel */}
          <Box sx={{ border: '1px solid #ddd', borderRadius: 2, px: 2, py: 1.5, margin: 1, backgroundColor: '#fafafa' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1.5 }}>Schedule Settings</Typography>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {/* Input Settings */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 280 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>Timing & Layout</Typography>
                <TextField
                  autoFocus
                  value={startTime}
                  onChange={(e) => setStartTime(Number(e.target.value))}
                  size='small'
                  label="Start Time (Hour)"
                  variant="outlined"
                  type='number' />
                <TextField
                  value={numCourt}
                  onChange={(e) => setNumCourt(Number(e.target.value))}
                  size='small'
                  label="Number of Courts"
                  variant="outlined"
                  type='number' />
                <TextField
                  value={matchDuration}
                  onChange={(e) => setMatchDuration(Number(e.target.value))}
                  size='small'
                  label="Match Duration (min)"
                  variant="outlined"
                  type='number' />
                <TextField
                  select
                  value={selectedTimeZone}
                  onChange={(e) => setSelectedTimeZone(e.target.value)}
                  size='small'
                  label="Timezone"
                >
                  {availableTimeZones.map((timeZone) => (
                    <MenuItem key={timeZone} value={timeZone}>{timeZone}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>Actions</Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant='contained'
                    color='success'
                    size='small'
                    onClick={onGenerateMatches}
                    disabled={isGeneratingMatches}
                    sx={{ flex: '1 1 100px' }}
                  >
                    {isGeneratingMatches ? 'Generating...' : 'Generate'}
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant='contained'
                    color='secondary'
                    size='small'
                    onClick={onAutoScheduleTwoDays}
                    sx={{ flex: '1 1 100px' }}
                  >
                    Auto 2-Day
                  </Button>
                  <Button
                    variant='outlined'
                    color='error'
                    size='small'
                    onClick={resetAllDaySchedules}
                    sx={{ flex: '1 1 100px' }}
                  >
                    Reset All
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant='outlined'
                    color='primary'
                    size='small'
                    disabled={tableRowDataHistory.length < 1}
                    onClick={onUndo}
                    sx={{ flex: '1 1 100px' }}
                  >
                    Undo
                  </Button>
                  <Button
                    variant='contained'
                    color='primary'
                    size='small'
                    onClick={onSaveSchedule}
                    sx={{ flex: '1 1 100px' }}
                  >
                    Save
                  </Button>
                </Box>
              </Box>

              {/* Event Order */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>Event Order</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 250, overflowY: 'auto' }}>
                  {displayEventOrder.map((eventID, index, currentOrder) => {
                    const event = tournament.events.find((item) => item.id === eventID)
                    if(!event) return null

                    return (
                      <Box key={event.id} sx={{ display:'flex', alignItems:'center', gap: 0.75, border: '1px solid #ddd', borderRadius: 1.5, px: 0.75, py: 0.4, justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#222' }}>{`${index + 1}. ${event.name?.[language]}`}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size='small' variant='outlined' disabled={index === 0} onClick={() => moveEventOrder(event.id, 'up')} sx={{ minWidth: 28, p: 0.5 }}>↑</Button>
                          <Button size='small' variant='outlined' disabled={index === (currentOrder.length - 1)} onClick={() => moveEventOrder(event.id, 'down')} sx={{ minWidth: 28, p: 0.5 }}>↓</Button>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </Box>

              {/* Match Statistics */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 280 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', textTransform: 'uppercase' }}>Match Statistics</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 250, overflowY: 'auto', fontSize: '0.9rem' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, borderBottom: '1px solid #ddd' }}>
                    <Typography sx={{ fontWeight: 600 }}>Total:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{matchStatistics?.total ?? 0}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, borderBottom: '1px solid #ddd' }}>
                    <Typography sx={{ fontSize: '0.85rem' }}>Group</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{matchStatistics?.byStep.group ?? 0}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, borderBottom: '1px solid #ddd' }}>
                    <Typography sx={{ fontSize: '0.85rem' }}>KO</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{matchStatistics?.byStep.playoff ?? 0}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, borderBottom: '1px solid #ddd' }}>
                    <Typography sx={{ fontSize: '0.85rem' }}>Consolation</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{matchStatistics?.byStep.consolation ?? 0}</Typography>
                  </Box>
                  {displayEventOrder.map((eventID) => {
                    const stats = matchStatistics?.byEvent[eventID]
                    if(!stats) return null

                    return (
                      <Box key={`stats-${eventID}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, borderBottom: '1px solid #eee', pb: 0.4 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>
                          {stats.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#555', textAlign: 'right' }}>
                          {stats.total}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Date Toggle */}
          <ToggleButtonGroup aria-label="Basic button group" sx={{ m:1 }} value={selectedDay} onChange={onChangeDay} exclusive>
            {getDaysArray(new Date(tournament.startDate), new Date(tournament.endDate)).map((d, i) => <ToggleButton key={`day-${i}`} value={d.toISOString()}>{moment(d).format('ddd, DD.MM')}</ToggleButton>)}
          </ToggleButtonGroup>

          <TableContainer component={Paper} sx={{ maxWidth: '100%', maxHeight: 500 }} >
            <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  {
                    ['เวลา/คอร์ด', ...Array.from({ length:numCourt }, (_, i) => `Court ${(i + 1)}`)].map((court, idx) => (
                      <TableCell
                        align='center'
                        key={`court-${court}`}
                        sx={idx === 0 ? { width: 84 } : { width: `calc((100% - 84px) / ${numCourt})` }}
                      >
                        {court}
                      </TableCell>
                    ))
                  }
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  tableRowData.map((timeSlot, i) => (
                    <TableRow key={`timeSlot-${i}`}>
                      {
                        timeSlot.map((match, j) => (
                          <TableCell
                            key={`match-${j}`}
                            align='center'
                            onDragOver={onDragOver}
                            onDrop={(e) => onDropMatch(e, i, j)}
                            sx={{
                              width: j === 0 ? 84 : `calc((100% - 84px) / ${numCourt})`,
                              backgroundColor: dragSource?.slot === i && dragSource?.court === j ? '#e3f2fd' : 'transparent',
                              cursor: dragSource ? 'grab' : 'default',
                              transition: 'background-color 0.2s',
                              p: 0.5,
                            }}
                          >
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
      <Dialog open={Boolean(pendingDrop)} onClose={onCloseDropActionDialog}>
        <DialogTitle>Choose Drop Action</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>This slot already has a match. Do you want to swap or insert?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDropActionDialog} color='inherit'>Cancel</Button>
          <Button onClick={() => onSelectDropAction('swap')} variant='outlined'>Swap</Button>
          <Button onClick={() => onSelectDropAction('insert')} variant='contained'>Insert</Button>
        </DialogActions>
      </Dialog>
    </TournamentLayout>
  )

}
export default Organizer