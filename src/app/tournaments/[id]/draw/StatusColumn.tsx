'use client'

import { MAP_DECISION_STATUS } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { TeamStatus } from '@/type'
import { Box, Button, Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

interface Props {
    status: TeamStatus;
    teamID: string;
    handleUpdate: (teamID: string, field: string, value: unknown) => void;
    isManager: boolean;
}

const StatusColumn = ({ status, handleUpdate, teamID, isManager }: Props) => {
  const { t } = useTranslation()
  const language = useSelector((state: RootState) => state.app.language)

  if(status !== TeamStatus.Idle || !isManager){
    return <Chip variant='outlined'label={MAP_DECISION_STATUS[status][language]} color={MAP_DECISION_STATUS[status].color} />
  }

  return (
    <Box sx={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
      <Button color='success' variant='outlined' onClick={() => handleUpdate(teamID, 'status', TeamStatus.Approved)}>{t('tournament.action.approve')}</Button>
      <Button color='error' variant='outlined' onClick={() => handleUpdate(teamID, 'status', TeamStatus.Reject)}>{t('tournament.action.reject')}</Button>
    </Box>
  )
}

export default StatusColumn