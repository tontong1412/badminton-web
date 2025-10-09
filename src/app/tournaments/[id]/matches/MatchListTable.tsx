'use client'
import { useMatchesTournament } from '@/app/libs/data'
import { Language, Match, MatchStatus } from '@/type'
import { Box, Button, Chip, CircularProgress, IconButton, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import { MAP_ROUND_NAME, MAP_STATUS_COLOR } from '@/app/constants'
import { useTranslation } from 'react-i18next'
import { FilterList } from '@mui/icons-material'
import { useState } from 'react'
import moment from 'moment'
import MatchMenu from './MatchMenu'
import { useRouter } from 'next/navigation'

interface MatchListTableProps {
  tournamentID: string
  isManager: boolean
}

const MatchListTable = ({ tournamentID, isManager }: MatchListTableProps) => {
  const { matches, isLoading } = useMatchesTournament(tournamentID)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { t } = useTranslation()
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [anchorElMenu, setAnchorElMenu] = useState<null | HTMLElement>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match|null>(null)
  const router = useRouter()

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
    setStatusAnchorEl(event.currentTarget)
  }

  const handleStatusClose = (value?: string) => {
    if (value) setStatusFilter(value)
    setStatusAnchorEl(null)
  }

  const sortMatch = (a: Match, b: Match) => {
    if(!a.matchNumber || !b.matchNumber){
      return 0
    }
    return a.matchNumber - b.matchNumber
  }

  const filteredRows: Match[] | undefined = matches?.filter((row) => {
    const statusMatch = statusFilter === 'All' || row.status === statusFilter
    return statusMatch && !row.skip
  }).sort(sortMatch)

  if(isLoading || !matches) return <CircularProgress/>

  return (
    <Box sx={{ m:2 }}>
      <TableContainer component={Paper} sx={{ maxHeight: 700 }}>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: 50 }}>{t('tournament.matchList.matchNumber')}</TableCell>
              <TableCell align="center" sx={{ width: 100 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('tournament.matchList.status')}
                  <Tooltip title="Filter by status">
                    <IconButton size="small" onClick={handleStatusClick}>
                      <FilterList fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </span>
                <Menu anchorEl={statusAnchorEl} open={Boolean(statusAnchorEl)} onClose={() => handleStatusClose()}>
                  <MenuItem onClick={() => handleStatusClose('All')}>All</MenuItem>
                  {
                    Object.values(MatchStatus).map((s) => (
                      <MenuItem key={s} value={s} onClick={() => handleStatusClose(s)}>
                        {s}
                      </MenuItem>
                    ))
                  }
                </Menu>
              </TableCell>
              <TableCell align="center" sx={{ width: 80 }}>{t('tournament.matchList.event')}</TableCell>
              <TableCell align="center" sx={{ width: 80 }}>{t('tournament.matchList.schedule')}</TableCell>
              <TableCell align="center" sx={{ width: 100 }}>{t('tournament.matchList.round')}</TableCell>

              <TableCell align="center"> {t('tournament.matchList.team')} </TableCell>
              <TableCell align="center" sx={{ width: 80 }}> {t('tournament.matchList.result')} </TableCell>
              <TableCell align="center">{t('tournament.matchList.team')}</TableCell>
              {isManager && <TableCell align="center" sx={{ width: 100 }}>{t('tournament.matchList.action.title')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows?.map((match, idx) => (
              <TableRow key={idx} role='button' onClick={() => {if(!isManager) router.push(`/matches/${match.id}`)}}>
                <TableCell align="center">
                  <Typography >{match.matchNumber}</Typography>
                </TableCell>
                <TableCell align="center">
                  {match.status === MatchStatus.Waiting
                    ? <Chip size='small' label={match.status} color={MAP_STATUS_COLOR[match.status]} variant="outlined" />
                    : <Box >
                      <Chip size='small' label={`court ${match.court}`} color={MAP_STATUS_COLOR[match.status]} variant="outlined" sx={{ m:'1px' }}/>
                      {match.umpire && <Chip size='small' label={match.umpire.officialName[language]?.split(' ')[0]} color={MAP_STATUS_COLOR[match.status]} variant="outlined" sx={{ m:'1px' }}/>}
                    </Box>
                  }
                </TableCell>
                <TableCell align="center">
                  <Typography >{match.event?.name[language]}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography >{moment(match.date).format('H.mm')}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography >{match.step === 'group' ? 'แบ่งกลุ่ม' : MAP_ROUND_NAME[match.round?.toString() as keyof typeof MAP_ROUND_NAME]}</Typography>
                </TableCell>
                <TableCell >
                  {match.teamA?.players.map((player) => {
                    return(<Box key={player.id} sx={{ display:'flex', gap: 2 }}>
                      <Typography sx={{ width: 170 }}>{player.officialName[language]}</Typography>
                      <Typography sx={{ maxWidth: 150 }}>{player.club}</Typography>
                    </Box>)
                  })}
                </TableCell>
                <TableCell align="center">
                  <Box >{match.scoreLabel.map((set, i) => <Typography key={i}>{set}</Typography>)}</Box>
                </TableCell>
                <TableCell>
                  {match.teamB?.players.map((player) => {
                    return(<Box key={player.id} sx={{ display:'flex', gap: 2 }}>
                      <Typography sx={{ width: 170 }}>{player.officialName[language]}</Typography>
                      <Typography sx={{ maxWidth: 150 }}>{player.club}</Typography>
                    </Box>)
                  })}
                </TableCell>
                {isManager && <TableCell align="center">
                  <Button fullWidth size="small" onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    setSelectedMatch(match)
                    setAnchorElMenu(event.currentTarget)
                  }}>{t('tournament.action.more')}</Button>
                </TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {selectedMatch &&
      <MatchMenu
        match={selectedMatch}
        setMatch={setSelectedMatch}
        anchorElMenu={anchorElMenu}
        setAnchorElMenu={setAnchorElMenu}
        isManager={isManager}
        tournamentID={tournamentID}
      />}
    </Box>
  )
}

export default MatchListTable