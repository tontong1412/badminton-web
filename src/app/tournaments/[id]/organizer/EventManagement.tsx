'use client'

import ConfirmDeleteModal from '@/app/components/ConfirmDeleteModal'
import EventModal from '@/app/components/EventModal'
import FloatingAddButton from '@/app/components/FloatingAddButton'
import { RootState } from '@/app/libs/redux/store'
import {   Language, Tournament, TournamentEvent } from '@/type'
import {  Button,  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { Dispatch, SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

interface EventManagementProps {
  tournament: Tournament;
  isManager: boolean;
  setTournament:Dispatch<SetStateAction<Tournament|undefined>>
}


const EventManagement = ({ tournament, setTournament }: EventManagementProps) => {
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [visible, setVisible] = useState(false)
  const [isCreating, setIsCreating] = useState(true)
  const [chosenEvent, setChosenEvent] = useState<TournamentEvent>()
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>{t('tournament.manageEvent.title')} </TableCell>
              <TableCell>{t('tournament.manageEvent.type')}</TableCell>
              <TableCell>{t('tournament.manageEvent.description')}</TableCell>
              <TableCell>{t('tournament.manageEvent.limit')}</TableCell>
              <TableCell >{t('tournament.manageEvent.fee')}</TableCell>
              <TableCell >{t('tournament.manageEvent.prize')}</TableCell>
              <TableCell >{t('tournament.manageEvent.format')}</TableCell>
              <TableCell >{''}</TableCell>
              <TableCell >{''}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tournament.events?.map((e, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Typography >{e.name[language]}</Typography>
                </TableCell>
                <TableCell>{e.type} </TableCell>
                <TableCell> {e.description}</TableCell>
                <TableCell> {e.limit}</TableCell>
                <TableCell >
                  <span>{e.fee.amount} {e.fee.currency}</span>
                </TableCell>
                <TableCell >
                  {e.prize}
                </TableCell>
                <TableCell >
                  {e.format}
                </TableCell>
                <TableCell align="center">
                  <Button color='error' onClick={() => {
                    setChosenEvent(e)
                    setDeleteDialogVisible(true)
                  }}> ลบ</Button>
                </TableCell>
                <TableCell align="center">
                  <Button onClick={() => {
                    setIsCreating(false)
                    setChosenEvent(e)
                    setVisible(true)
                  }}>แก้ไข</Button>
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <FloatingAddButton onClick={() => {
        setVisible(true)
        setIsCreating(true)
        setChosenEvent(undefined)
      }}/>
      <EventModal visible={visible} setVisible={setVisible} isCreating={isCreating} tournament={tournament} setTournament={setTournament} event={chosenEvent} setEvent={setChosenEvent}/>
      <ConfirmDeleteModal visible={deleteDialogVisible} setVisible={setDeleteDialogVisible} tournament={tournament} setTournament={setTournament} event={chosenEvent}/>
    </>
  )
}
export default EventManagement