'use client'
import { useMatchesTournament } from '@/app/libs/data'
import { Language, Match, MatchStatus, MatchStep, Player } from '@/type'
import { Box, CircularProgress, Typography } from '@mui/material'
import styles from '../draw/Bracket/MatchList.module.scss'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import { MAP_ROUND_NAME } from '@/app/constants'
import MatchUp from '../draw/Bracket/MatchUp'
import PlayerPopover from '../draw/PlayerPopover'
import { MouseEvent, useState } from 'react'

interface MatchListMobileProps {
  tournamentID: string
  status: MatchStatus
  enableMatchNavigation?: boolean
  enablePlayerPopover?: boolean
  useHandicap?: boolean
}

const MatchListMobile = ({
  tournamentID,
  status,
  enableMatchNavigation = true,
  enablePlayerPopover = false,
  useHandicap = false,
}: MatchListMobileProps) => {
  const { matches } = useMatchesTournament(tournamentID)
  const router = useRouter()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [showPlayer, setShowPlayer] = useState<Player | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

  const handleShowPlayerDetail = (e: MouseEvent<HTMLDivElement>, player: Player) => {
    if(!enablePlayerPopover){
      return
    }
    e.stopPropagation()
    setShowPlayer(player)
    setAnchorEl(e.currentTarget)
  }

  const handleCardClick = (matchID: string) => {
    if(enableMatchNavigation){
      router.push(`/matches/${matchID}`)
    }
  }

  const sortMatch = (a: Match, b: Match) => {
    if(!a.matchNumber || !b.matchNumber){
      return 0
    }
    if(status === MatchStatus.Waiting){
      return a.matchNumber - b.matchNumber
    }
    return b.matchNumber - a.matchNumber
  }

  const getRoundLabel = (match: Match) => {
    if(match.step === MatchStep.Group){
      return 'แบ่งกลุ่ม'
    }

    const roundName = MAP_ROUND_NAME[match.round?.toString() as keyof typeof MAP_ROUND_NAME]
    if(match.step === MatchStep.Consolation){
      const consolationPrefix = language === 'th' ? 'สายล่าง' : 'Con.'
      return roundName ? `${consolationPrefix} - ${roundName}` : consolationPrefix
    }

    return roundName ?? '-'
  }

  if(!matches) return <CircularProgress/>

  return (
    <Box>
      {matches.filter((m) => m.status === status && !m.skip).sort(sortMatch)?.map((match) =>
        <div key={match.id} onClick={() => handleCardClick(match.id)} className={`${styles['match-list']} ${styles.matchups}`}>
          <Box
            sx={{
              backgroundColor: '#80644f',
              borderTopLeftRadius: '0.25rem',
              borderTopRightRadius: '0.25rem',
              color: 'whitesmoke',
              px: '10px',
              py: 0,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Typography>
              {`${match.event?.name?.[language]}  รอบ ${getRoundLabel(match)}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: '10px' }}>
              {match.status !== 'waiting' && (
                <Typography>
                  {`#${match.matchNumber}`}
                </Typography>
              )}
              {match.status === 'playing' && (
                <Typography>
                  {`คอร์ด - ${match.court}`}
                </Typography>
              )}
            </Box>
          </Box>
          <MatchUp match={match} style='list' onPlayerClick={enablePlayerPopover ? handleShowPlayerDetail : undefined}/>
        </div>
      )}
      {showPlayer && <PlayerPopover showPlayer={showPlayer} setShowPlayer={setShowPlayer} anchorEl={anchorEl} setAnchorEl={setAnchorEl} useHandicap={useHandicap}/>}
    </Box>
  )
}

export default MatchListMobile