'use client'

import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, SERVICE_ENDPOINT } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { PaymentStatus, TeamStatus, EventTeam, Player, Language } from '@/type'
import {  FilterList } from '@mui/icons-material'
import { Button, Chip,  CircularProgress,  IconButton, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tooltip, Typography } from '@mui/material'
import axios from 'axios'
import moment from 'moment'
import { MouseEvent, useState } from 'react'
import { useSelector } from 'react-redux'
import StatusColumn from './StatusColumn'
import { useTranslation } from 'react-i18next'
import PlayerPopover from './PlayerPopover'
import ParticipantMenu from './ParticipantMenu'
import { useEvent } from '@/app/libs/data'

interface ParticipantTableProps {
  eventID: string;
  isManager: boolean;
}

interface UpdateTeamPayload {
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
}

const ParticipantTable = ({ eventID, isManager }: ParticipantTableProps) => {
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [orderBy, setOrderBy] = useState<Exclude<keyof EventTeam, 'slip' | 'note'>>('date')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null)
  const [paymentAnchorEl, setPaymentAnchorEl] = useState<null | HTMLElement>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [paymentFilter, setPaymentFilter] = useState<string>('All')
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

  const [anchorElMenu, setAnchorElMenu] = useState<null | HTMLElement>(null)
  const [menuTeam, setMenuTeam] = useState<EventTeam | null>(null)
  const { event, mutate: setEvent } = useEvent(eventID)

  const handleSort = (property: Exclude<keyof EventTeam, 'slip' | 'note'>) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
    setStatusAnchorEl(event.currentTarget)
  }

  const handlePaymentClick = (event: React.MouseEvent<HTMLElement>) => {
    setPaymentAnchorEl(event.currentTarget)
  }

  const handleStatusClose = (value?: string) => {
    if (value) setStatusFilter(value)
    setStatusAnchorEl(null)
  }

  const handlePaymentClose = (value?: string) => {
    if (value) setPaymentFilter(value)
    setPaymentAnchorEl(null)
  }

  const updateTeam = async(teamID: string, field: string, value: unknown) => {
    const payload : UpdateTeamPayload = {
      eventID,
      teamID,
      field,
      value
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-team`, payload, { withCredentials: true })
    setEvent(response.data)
  }

  const handleShowPlayerDetail = (e: MouseEvent<HTMLDivElement>, player: Player) => {
    setShowPlayer(player)
    setAnchorEl(e.currentTarget)
  }

  const sortedRows: EventTeam[] | undefined = event && [...event.teams].sort((a, b) => {
    const valA = a[orderBy]
    const valB = b[orderBy]
    if(!valA || !valB) return 0
    if (valA < valB) return order === 'asc' ? -1 : 1
    if (valA > valB) return order === 'asc' ? 1 : -1
    return 0
  })

  const filteredRows: EventTeam[] | undefined = sortedRows && sortedRows.filter((row) => {
    const statusMatch = statusFilter === 'All' || row.status === statusFilter
    const paymentMatch = paymentFilter === 'All' || row.paymentStatus === paymentFilter
    return statusMatch && paymentMatch
  })

  const filterTotal = (team: EventTeam) => {
    return team.paymentStatus === PaymentStatus.Paid || team.paymentStatus === PaymentStatus.Pending
  }


  if (!event) return <CircularProgress />
  return (
    <>
      <Typography sx={{ textAlign:'right' }}>{`${t('tournament.registration.total')} ${event?.teams.filter(filterTotal).length}/${event?.limit}`}</Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  // align="center"
                  active={orderBy === 'date'}
                  direction={orderBy === 'date' ? order : 'asc'}
                  onClick={() => handleSort('date')}
                >
                  {t('tournament.participants.date')}
                </TableSortLabel>
              </TableCell>
              <TableCell>{t('tournament.participants.team')}</TableCell>
              <TableCell>{t('tournament.participants.club')}</TableCell>
              <TableCell align="center">
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('tournament.participants.status')}
                  <Tooltip title="Filter by status">
                    <IconButton size="small" onClick={handleStatusClick}>
                      <FilterList fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </span>
                <Menu anchorEl={statusAnchorEl} open={Boolean(statusAnchorEl)} onClose={() => handleStatusClose()}>
                  <MenuItem onClick={() => handleStatusClose('All')}>All</MenuItem>
                  {
                    Object.values(TeamStatus).map((s) => (
                      <MenuItem key={s} value={s} onClick={() => handleStatusClose(s)}>
                        {MAP_DECISION_STATUS[s][language]}
                      </MenuItem>
                    ))
                  }
                </Menu>
              </TableCell>
              <TableCell align="center">
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('tournament.participants.paymentStatus')}
                  <Tooltip title="Filter by payment status">
                    <IconButton size="small" onClick={handlePaymentClick}>
                      <FilterList fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </span>
                <Menu anchorEl={paymentAnchorEl} open={Boolean(paymentAnchorEl)} onClose={() => handlePaymentClose()}>
                  <MenuItem onClick={() => handlePaymentClose('All')}>All</MenuItem>
                  {
                    Object.values(PaymentStatus).map((s) => (
                      <MenuItem key={s} value={s} onClick={() => handlePaymentClose(s)}>
                        {MAP_PAYMENT_STATUS[s][language]}
                      </MenuItem>
                    ))
                  }
                </Menu>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'shuttlecockCredit'}
                  direction={orderBy === 'shuttlecockCredit' ? order : 'asc'}
                  onClick={() => handleSort('shuttlecockCredit')}
                >
                  {t('tournament.participants.shuttlecockCredit')}
                </TableSortLabel>
              </TableCell>
              <TableCell >{t('tournament.registration.note')}</TableCell>
              {isManager && <TableCell></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows?.map((team, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Typography >{moment(team.date).format('DD-MM-YYYY')}</Typography>
                </TableCell>
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
                  <StatusColumn status={team.status} handleUpdate={updateTeam} teamID={team.id} isManager={isManager}/>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={MAP_PAYMENT_STATUS[team.paymentStatus][language]}
                    variant='outlined'
                    color={MAP_PAYMENT_STATUS[team.paymentStatus].color} />
                </TableCell>
                <TableCell align="center">
                  {team.shuttlecockCredit}
                </TableCell>
                <TableCell>
                  {team.note}
                </TableCell>
                {isManager && <TableCell align="center">
                  <Button fullWidth size="small" onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    setAnchorElMenu(event.currentTarget)
                    setMenuTeam(team)
                  }}>{t('tournament.action.more')}</Button>
                </TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl}/>}
      {menuTeam && event && isManager && <ParticipantMenu
        menuTeam={menuTeam}
        setMenuTeam={setMenuTeam}
        anchorElMenu={anchorElMenu}
        setAnchorElMenu={setAnchorElMenu}
        event={event}
        setEvent={setEvent}
        isManager={isManager}
      />}
    </>
  )
}
export default ParticipantTable