'use client'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { useMatchesTournament, useTournament } from '@/app/libs/data'
// import { RootState } from '@/app/libs/redux/store'
import { MatchStatus, TournamentMenu, TournamentStatus } from '@/type'
import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery } from '@mui/material'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
// import { useSelector } from 'react-redux'
import theme from '@/theme'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { useAppDispatch } from '@/app/providers'
import MatchListMobile from './MatchListMobile'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import { Block } from '@mui/icons-material'

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
  if(!isManager && tournament?.status !== TournamentStatus.SchedulePublished && tournament?.status !== TournamentStatus.Ongoing && tournament?.status !== TournamentStatus.Finished){
    return(
      <TournamentLayout tournament={tournament}>
        <Box sx={{ color: 'GrayText', display: 'flex', flexDirection:'column', alignItems: 'center', mt:5 }} >
          <Block sx={{ fontSize: 100 }}/>
          <Typography variant='h6' align='center'>Schedule has not yet been published</Typography>
        </Box>
      </TournamentLayout>
    )
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
          : <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 2,
                alignItems: 'start',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Waiting</Typography>
                <Box
                  sx={{
                    height: 'calc(100vh - 220px)',
                    overflowY: 'auto',
                    pr: 1,
                  }}
                >
                  <MatchListMobile
                    tournamentID={tournament.id}
                    status={MatchStatus.Waiting}
                    enableMatchNavigation={false}
                    enablePlayerPopover
                    useHandicap={Boolean(tournament.useHandicap)}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Playing</Typography>
                <Box
                  sx={{
                    height: 'calc(100vh - 220px)',
                    overflowY: 'auto',
                    pr: 1,
                  }}
                >
                  <MatchListMobile
                    tournamentID={tournament.id}
                    status={MatchStatus.Playing}
                    enableMatchNavigation={false}
                    enablePlayerPopover
                    useHandicap={Boolean(tournament.useHandicap)}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Finished</Typography>
                <Box
                  sx={{
                    height: 'calc(100vh - 220px)',
                    overflowY: 'auto',
                    pr: 1,
                  }}
                >
                  <MatchListMobile
                    tournamentID={tournament.id}
                    status={MatchStatus.Finished}
                    enableMatchNavigation={false}
                    enablePlayerPopover
                    useHandicap={Boolean(tournament.useHandicap)}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
      }
    </TournamentLayout>
  )
}
export default MatchesPage