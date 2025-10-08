'use client'

import { MAP_GROUP_NAME } from '@/app/constants'
import { useEvent, useMatchesEvent } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { EventTeam, Language, MatchStatus, MatchStep, Player } from '@/type'
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import moment from 'moment'
import { useSelector } from 'react-redux'
import PlayerPopover from './PlayerPopover'
import { MouseEvent, useState } from 'react'

interface GroupTableProps {
  eventID: string
}

const GroupTable = ({ eventID }: GroupTableProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { matches } = useMatchesEvent(eventID)
  const { event } = useEvent(eventID)
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

  const handleShowPlayerDetail = (e: MouseEvent<HTMLDivElement>, player: Player) => {
    setShowPlayer(player)
    setAnchorEl(e.currentTarget)
  }

  const processDataSource = (data:EventTeam[]) => {
    return data.map((team) => {
      const tempMatches = matches.filter((elm) => elm.step === MatchStep.Group && (elm.teamA.id === team.id || elm.teamB.id === team.id))
      const result = {
        team: team,
        diff: 0,
        score: 0,
      }
      tempMatches.forEach((match) => {
        if (match.teamB.id === team.id) {
          const temp = { ...match.teamB }
          match.teamB = { ...match.teamA }
          match.teamA = { ...temp }
          match.scoreLabel = match.scoreLabel.map((set) => {
            const score = set.split('-')
            const tempScore = score[0]
            score[0] = score[1]
            score[1] = tempScore
            return score.join('-')
          })
        }
        if(match.status === MatchStatus.Finished){
          match.scoreLabel.map((set) => {
            const score = set.split('-')
            result.diff += Number(score[0]) - Number(score[1])
          })
        }

        result.score += match.teamA.scoreSet
      })
      return result
    })
  }


  const generateTableRow = (group:number) => {
    if(!matches) return
    const matchesInGroup = matches.filter((m) => m.step === MatchStep.Group && m.groupOrder === group)
    if(!event?.draw?.group) return

    const data = processDataSource(event.draw.group[group])

    const tableRow = data.map((teamA, i) => {
      return (
        <TableRow key={`row-team-${i}`}>
          <TableCell key={`team-${teamA.team.id}`}
            scope="row"
            sx={{
              borderRight: '1px solid #e0e0e0',
              position: 'sticky',
              left: 0,
              zIndex: 1, // Stay on top of scrolling content
              backgroundColor: 'white', // Match your table background
            }}
          >
            {teamA.team.players.map((p) => <div key={p.id} onClick={(e) => handleShowPlayerDetail(e, p)}>
              <Typography >{p.officialName[language]}</Typography>
            </div>)}
          </TableCell>
          {
            event?.draw?.group?.[group]?.map((teamB) => {
              const match = matchesInGroup.find((m) => (m.teamA.id === teamA.team.id && m.teamB.id === teamB.id) || (m.teamA.id === teamB.id && m.teamB.id === teamA.team.id))
              if(!match) return <TableCell sx={{ borderRight: '1px solid #e0e0e0' }} align='center' key={`match-x-${teamB.id}`}>X</TableCell>
              if(match.status === MatchStatus.Finished){
                if (match.teamA.id === teamB.id) {
                  const temp = { ...match.teamB }
                  match.teamB = { ...match.teamA }
                  match.teamA = { ...temp }
                  match.scoreLabel = match.scoreLabel.map((set) => {
                    const score = set.split('-')
                    const tempScore = score[0]
                    score[0] = score[1]
                    score[1] = tempScore
                    return score.join('-')
                  })
                }
                return (
                  <TableCell align='center' key={`match-${match.id}`} sx={{ borderRight: '1px solid #e0e0e0' }}>
                    {match.scoreLabel.map((set, i) => {
                      return <div key={i + 1}>{set}</div>
                    })}
                  </TableCell>
                )
              }
              return (
                <TableCell align='center' key={`match-${match.id}`} sx={{ borderRight: '1px solid #e0e0e0' }}>
                  <Typography>{`#${match.matchNumber}`}</Typography>
                  <Typography>{moment(match.date).format('D/MM/YYYY')}</Typography>
                  <Typography>{moment(match.date).format('HH.mm')}</Typography>
                </TableCell>
              )
            })
          }

          <TableCell align='center' key={`match-sore-${teamA.team.id}`} sx={{ borderRight: '1px solid #e0e0e0' }}>
            <Typography>{teamA.score}</Typography>
          </TableCell>
          <TableCell align='center' key={`match-diff-${teamA.team.id}`} sx={{ borderRight: '1px solid #e0e0e0' }}>
            <Typography>{teamA.diff}</Typography>
          </TableCell>
        </TableRow>
      )
    })
    return tableRow
  }


  if(!event?.draw?.group) return
  return (
    <Box>
      {event.draw.group.map((group, i) => {
        // Iteration for each group
        return (
          <TableContainer key={`group-${i}`} component={Paper} sx={{ mt:3, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: '#e0e0e0',
                      borderRight: '1px solid #e0e0e0',
                      position: 'sticky',
                      left: 0,
                      zIndex: 100, // Ensure it's on top of everything
                      minWidth: 180
                    }}>{`Group ${MAP_GROUP_NAME[i].NAME}`}</TableCell>
                  {
                    group.map((team) => {
                      // Iteration for team in each group
                      return (
                        <TableCell
                          align='center'
                          sx={{
                            minWidth:180,
                            borderRight: '1px solid #e0e0e0',
                            backgroundColor: '#e0e0e0',
                          }} key={`team-${team.id}`}>{team.players.map((p) => <Typography key={`player-${p.id}`}>{p.officialName[language]}</Typography>)}</TableCell>
                      )
                    })
                  }
                  <TableCell align='center' sx={{ borderRight: '1px solid #e0e0e0', backgroundColor: '#e0e0e0' }}>Score</TableCell>
                  <TableCell align='center' sx={{ borderRight: '1px solid #e0e0e0', backgroundColor: '#e0e0e0' }}>Diff</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {generateTableRow(i)}
              </TableBody>
            </Table>
          </TableContainer>
        )
      })}
      {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
    </Box>
  )
}
export default GroupTable