'use client'

import Transition from '@/app/components/ModalTransition'
import { MAP_ROUND_NAME, SERVICE_ENDPOINT } from '@/app/constants'
import { useMatchesTournament, useTournament } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Language, Match, MatchStatus, MatchStep, SimplePlayer } from '@/type'
import { ExpandMore } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, InputLabel, MenuItem, Radio, RadioGroup, Select, TextField, Typography } from '@mui/material'
import axios from 'axios'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

interface AssignMatchModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>
  tournamentID: string;
  match: Match;
}

type UpdateMatchFormInputs = {
  court: string;
  umpire: string;
}

interface AvailableUmpires extends SimplePlayer {
  totalMatchJudged: number;
}

const AssignMatchModal = ({ visible, setVisible, tournamentID, match }: AssignMatchModalProps) => {
  const { t } = useTranslation()
  const [court, setCourt] = useState<UpdateMatchFormInputs['court']>(match.court ?? '')
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [umpireID, setUmpireID] = useState<UpdateMatchFormInputs['umpire']>(match.umpire?.id ?? '')
  const [buttonLoading, setButtonLoading] = useState(false)
  const [availableUmpires, setAvailableUmpires] = useState<AvailableUmpires[]>([])
  const { tournament } = useTournament(tournamentID)
  const { matches, mutate } = useMatchesTournament(tournamentID)
  const [status, setStatus] = useState(MatchStatus.Playing)
  const [shuttlecockUsed, setShuttlecockUsed] = useState<string>(match.shuttlecockUsed?.toString() ?? '')

  const handleSubmit = async(e) => {
    e.preventDefault()
    setButtonLoading(true)
    const umpire = tournament.umpires.find((u) => u.id === umpireID)
    try{
      await axios.put(`${SERVICE_ENDPOINT}/matches/${match.id}`, {
        court,
        umpire: status === 'waiting' ? null : umpire,
        status,
        shuttlecockUsed: shuttlecockUsed === '' ? undefined : Number(shuttlecockUsed),
      }, { withCredentials:true })
      setButtonLoading(false)
      handleCloseModal()
      mutate()
    }catch (error){
      console.error(error)
      setButtonLoading(false)
      handleCloseModal()
    }
  }

  const handleCloseModal = () => {
    setVisible(false)
    setCourt('')
    setUmpireID('')
  }

  useEffect(() => {
    getAvailableUmpires()
  }, [matches, tournament, match])

  const getAvailableUmpires = () => {
    const playingMatches = matches.filter((m) => m.status === MatchStatus.Playing && m.id !== match.id)
    const occupiedUmpires = playingMatches.map((m) => m.umpire?.id)
    const tempAvailableUmpires = tournament.umpires.filter((u) => !occupiedUmpires.includes(u.id))
    const availableUmpiresWithStat = tempAvailableUmpires.map((u) => {
      const totalMatchesJudged = matches.filter((m) => m.umpire?.id === u.id)
      return {
        ...u,
        totalMatchJudged: totalMatchesJudged.length
      }
    })
    setAvailableUmpires(availableUmpiresWithStat)
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
          {t('tournament.matchList.announce.title')}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 600 }}>
          <TextField
            size='small'
            label={t('tournament.matchList.announce.court')}
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            margin="normal"
          />
          <Box sx={{ mt:2 }}/>
          <Typography>{t('tournament.matchList.announce.event')} {match.event?.name[language]}</Typography>
          <Typography>{t('tournament.matchList.announce.round')} {match.step === MatchStep.Group ? 'แบ่งกลุ่ม' : MAP_ROUND_NAME[match.round?.toString() as keyof typeof MAP_ROUND_NAME]}</Typography>

          <Box sx={{ mt:2 }}/>
          {match.teamA?.players.map((p) => <Box key={p.id} sx={{ display:'flex' }}>
            <Typography sx={{ width: 200 }}>{p.officialName[language] || p.officialName['th']}</Typography>
            <Typography>{p.club}</Typography>
          </Box>)}

          <Box sx={{ mt:2 }}/>
          <Typography>{t('tournament.matchList.announce.vs')}</Typography>

          <Box sx={{ mt:2 }}/>
          {match.teamB?.players.map((p) => <Box key={p.id} sx={{ display:'flex' }}>
            <Typography sx={{ width: 200 }}>{p.officialName[language] || p.officialName['th']}</Typography>
            <Typography>{p.club}</Typography>
          </Box>)}

          <Box sx={{ mt:2 }}/>
          <FormControl fullWidth margin="normal">
            <InputLabel size='small' id="umpire-label">{t('tournament.matchList.announce.umpire')}</InputLabel>
            <Select
              size='small'
              label={t('tournament.matchList.announce.umpire')}
              labelId="umpire-label"
              value={umpireID}
              onChange={(e) => setUmpireID(e.target.value)}>
              {availableUmpires.sort((a, b) => a.totalMatchJudged - b.totalMatchJudged).map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <Box sx={{ width: '100%', display:'flex', justifyContent:'space-between' }}>
                    <Typography>{u.officialName[language]}</Typography>
                    <Typography>Total Match: {u.totalMatchJudged}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Accordion
            elevation={0}
            sx={{
              backgroundColor: 'transparent', // Make the background transparent
              border: 'none',               // Remove all borders
              '&:before': {                 // Remove the default divider line
                display: 'none',
              },
              '&.Mui-expanded': {           // Ensure it stays transparent/flat when expanded
                margin: '0',
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              <Typography component="span">Advanced Option</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box flexDirection={'column'}>
                <TextField
                  size='small'
                  label={t('tournament.matchList.announce.shuttlecockUsed')}
                  value={shuttlecockUsed}
                  onChange={(e) => setShuttlecockUsed(e.target.value)}
                  margin="normal"
                />
                <Box marginTop={2}/>
                <FormControl>
                  <FormLabel id="status-radio-buttons-group-label">Status</FormLabel>
                  <RadioGroup
                    aria-labelledby="status-radio-buttons-group-label"
                    defaultValue={MatchStatus.Playing}
                    name="radio-buttons-group"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MatchStatus)}
                  >
                    <FormControlLabel value={MatchStatus.Waiting} control={<Radio />} label="Waiting" />
                    <FormControlLabel value={MatchStatus.Playing} control={<Radio />} label="Playing" />
                    <FormControlLabel value={MatchStatus.Finished} control={<Radio />} label="Finished" />
                  </RadioGroup>
                </FormControl>
              </Box>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
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
export default AssignMatchModal