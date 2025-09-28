'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { useMatchesTournament, useTournament } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { MatchStatus, TournamentMenu } from '@/type'
import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery } from '@mui/material'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import theme from '@/theme'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { useAppDispatch } from '@/app/providers'
import MatchListMobile from './MatchListMobile'
import MatchListTable from './MatchListTable'

const MatchesPage = () => {
  const params = useParams()
  const dispatch = useAppDispatch()
  const { tournament } = useTournament(params.id as string)
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.Waiting)
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [isManager, setIsManager] = useState(false)
  const user = useSelector((state: RootState) => state.app.user)
  const { matches } = useMatchesTournament(params.id as string)

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Matches))
  }, [dispatch])

  useEffect(() => {
    if(user && tournament && tournament.managers?.map((m) => m.id)?.includes(user?.player.id)){
      setIsManager(true)
    }else{
      setIsManager(false)
    }
  }, [user, tournament])

  const handleStatus = (
    event: React.MouseEvent<HTMLElement>,
    newStatus: MatchStatus,
  ) => {
    if(newStatus !== null){
      setStatus(newStatus)
    }
  }


  return (
    <TournamentLayout tournament={tournament}>
      {!matches
        ? <CircularProgress/>
        : isMobile
          ? <Box sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
                <ToggleButtonGroup
                  value={status}
                  onChange={handleStatus}
                  color='primary'
                  exclusive
                >
                  <ToggleButton value={MatchStatus.Waiting} aria-label="left aligned">
                    <Typography>Waiting</Typography>
                  </ToggleButton>
                  <ToggleButton value={MatchStatus.Playing} aria-label="left aligned">
                    <Typography>Playing</Typography>
                  </ToggleButton>
                  <ToggleButton value={MatchStatus.Finished} aria-label="centered">
                    Finished
                  </ToggleButton>
                </ToggleButtonGroup>
                <MatchListMobile tournamentID={tournament.id} status={status}/>

              </Box>
            </Box>
          </Box>
          : <MatchListTable tournamentID={tournament.id} isManager={false}/>
      }
    </TournamentLayout>
  )
}
export default MatchesPage