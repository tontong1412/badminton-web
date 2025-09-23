'use client'

import { MAP_GROUP_NAME } from '@/app/constants'
import { useEvent, useMatches } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Language, MatchStep } from '@/type'
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

interface GroupTableProps {
  eventID: string
}

const GroupTable = ({ eventID }: GroupTableProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { t } = useTranslation()
  const { matches } = useMatches(eventID)
  const { event } = useEvent(eventID)


  const generateTableRow = (group:number) => {
    if(!matches) return
    const matchesInGroup = matches.filter((m) => m.step === MatchStep.Group && m.groupOrder === group)
    if(!event?.draw?.group) return
    const tableRow = event.draw.group[group].map((teamA) => {
      return (
        <TableRow key={`row-team-${teamA.id}`}>
          <TableCell key={`team-${teamA.id}`}
            scope="row"
            sx={{
              borderRight: '1px solid #e0e0e0',
              position: 'sticky',
              left: 0,
              zIndex: 1, // Stay on top of scrolling content
              backgroundColor: 'white', // Match your table background
            }}
          >
            {teamA.players.map((p) => <Typography key={`player-${p.id}`}>{p.officialName[language]}</Typography>)}
          </TableCell>
          {
            event?.draw?.group?.[group]?.map((teamB) => {
              const match = matchesInGroup.find((m) => (m.teamA.id === teamA.id && m.teamB.id === teamB.id) || (m.teamA.id === teamB.id && m.teamB.id === teamA.id))
              if(!match) return <TableCell sx={{ borderRight: '1px solid #e0e0e0' }} align='center' key={'match-x'}>X</TableCell>
              return (
                <TableCell align='center' key={`match-${match.id}`} sx={{ borderRight: '1px solid #e0e0e0' }}>
                  <Typography>{`#${match.matchNumber}`}</Typography>
                  <Typography>{moment(match.date).format('D/MM/YYYY')}</Typography>
                  <Typography>{moment(match.date).format('HH.mm')}</Typography>
                </TableCell>
              )
            })
          }
          <TableCell align='center' sx={{ borderRight: '1px solid #e0e0e0' }}>
            {'score'}
          </TableCell>
          <TableCell align='center' sx={{ borderRight: '1px solid #e0e0e0' }}>
            {'dif'}
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
                      backgroundColor: '#80644f',
                      color: 'white',
                      borderRight: '1px solid #e0e0e0',
                      position: 'sticky',
                      left: 0,
                      zIndex: 100, // Ensure it's on top of everything
                      minWidth: 180
                    }}>{`Group ${MAP_GROUP_NAME[i].NAME}`}</TableCell>
                  {
                    group.map((team, i) => {
                      // Iteration for team in each group
                      return (
                        <TableCell sx={{
                          minWidth:180,
                          borderRight: '1px solid #e0e0e0',
                          color: 'white',
                          backgroundColor: '#80644f',
                        }} key={`team-${team.id}`}>{team.players.map((p) => <Typography key={`player-${p.id}`}>{p.officialName[language]}</Typography>)}</TableCell>
                      )
                    })
                  }
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0', backgroundColor: '#80644f', color: 'white' }}>Score</TableCell>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0', backgroundColor: '#80644f', color: 'white' }}>Diff</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {generateTableRow(i)}
              </TableBody>
            </Table>
          </TableContainer>
        )
      })}
    </Box>
  )
}
export default GroupTable