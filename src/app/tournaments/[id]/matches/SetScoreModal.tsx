'use client'

import Transition from '@/app/components/ModalTransition'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { useMatchesTournament } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import {  Language, Match, MatchStatus } from '@/type'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import axios from 'axios'
import { Dispatch, FormEvent, SetStateAction,  useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

interface SetscoreModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>
  tournamentID: string;
  match: Match;
}

const SetscoreModal = ({ visible, setVisible, tournamentID, match }: SetscoreModalProps) => {
  const { t } = useTranslation()
  const [buttonLoading, setButtonLoading] = useState(false)
  const { mutate } = useMatchesTournament(tournamentID)
  const [score, setScore] = useState(match.scoreLabel)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [error, setError] = useState('')

  const handleSubmit = async(e: FormEvent) => {
    e.preventDefault()
    setButtonLoading(true)
    try{
      await axios.post(`${SERVICE_ENDPOINT}/matches/set-score`, {
        matchID: match.id,
        status: MatchStatus.Finished,
        score,
      }, { withCredentials:true })
      setButtonLoading(false)
      handleCloseModal()
      mutate()
    }catch (error){
      if(axios.isAxiosError(error)){
        setError(error.response?.data.message)
        setButtonLoading(false)
      }else{
        console.error('Unexpected error:', error)
      }
    }
  }

  const handleCloseModal = () => {
    setVisible(false)
    setError('')

  }

  const onChangeSetScore = (value: string, set: number) => {
    const tempScore = [...score]
    tempScore[set] = value
    setScore(tempScore)
  }

  return (
    <Dialog
      fullWidth
      open={visible}
      onClose={handleCloseModal}
      slots={{ transition: Transition }}
    >

      <Box
        component='form'
        onSubmit={handleSubmit}
      >
        <DialogTitle>
          ผลการแข่งขัน
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 600, display: 'flex', justifyContent:'space-between', alignItems: 'center' }}>

          <Box width={'50%'} textAlign={'center'}>
            {match.teamA?.players.map((p) => <Typography key={p.id}>{p.officialName[language]}</Typography>)}
          </Box>
          <Box width={'50%'}>
            <TextField
              size='small'
              label={'เซ็ตที่ 1 ตัวอย่าง  21-5 '}
              value={score[0] || ''}
              onChange={(e) => onChangeSetScore(e.target.value, 0)}
              margin="normal"
            />
            <Box/>
            <TextField
              size='small'
              label={'เซ็ตที่ 2'}
              value={score[1] || ''}
              onChange={(e) => onChangeSetScore(e.target.value, 1)}
              margin="normal"
            />
            <Box/>
            <TextField
              size='small'
              label={'เซ็ตที่ 3'}
              value={score[2] || ''}
              onChange={(e) => onChangeSetScore(e.target.value, 2)}
              margin="normal"
            />
          </Box>
          <Box width={'50%'} textAlign={'center'}>
            {match.teamB?.players.map((p) => <Typography key={p.id}>{p.officialName[language]}</Typography>)}
          </Box>

        </DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseModal}>
            {t('action.cancel')}
          </Button>
          <Button type="submit" variant="contained" loading={buttonLoading} disabled={buttonLoading}>
            {t('action.confirm')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )

}
export default SetscoreModal