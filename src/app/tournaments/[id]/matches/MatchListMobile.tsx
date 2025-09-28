'use client'
import { useMatchesTournament } from '@/app/libs/data'
import { Language, Match, MatchStatus } from '@/type'
import { Box, CircularProgress } from '@mui/material'
import styles from '../draw/Bracket/MatchList.module.scss'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import { MAP_ROUND_NAME } from '@/app/constants'
import MatchUp from '../draw/Bracket/MatchUp'

interface MatchListMobileProps {
  tournamentID: string
  status: MatchStatus
}

const MatchListMobile = ({ tournamentID, status }: MatchListMobileProps) => {
  const { matches } = useMatchesTournament(tournamentID)
  const router = useRouter()
  const language: Language = useSelector((state: RootState) => state.app.language)

  const sortMatch = (a: Match, b: Match) => {
    if(!a.matchNumber || !b.matchNumber){
      return 0
    }
    return a.matchNumber - b.matchNumber
  }

  if(!matches) return <CircularProgress/>

  return (
    <Box>
      {matches.filter((m) => m.status === status && !m.skip).sort(sortMatch)?.map((match) =>
        <div key={match.id} onClick={() => router.push(`/match/${match.id}`)} className={`${styles['match-list']} ${styles.matchups}`}>
          <div style={{
            backgroundColor: '#80644f',
            borderTopLeftRadius: '0.25rem',
            borderTopRightRadius: '0.25rem',
            color: 'whitesmoke',
            padding: '0px 10px',
            display: 'flex',
            justifyContent: 'space-between',

          }}>
            <div>{`${match.event?.name[language]}  รอบ ${match.step === 'group' ? 'แบ่งกลุ่ม' : MAP_ROUND_NAME[match.round?.toString() as keyof typeof MAP_ROUND_NAME]}`}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {match.status !== 'waiting' && <div>{`#${match.matchNumber}`}</div>}
              {match.status === 'playing' && <div>{`คอร์ด - ${match.court}`}</div>}
            </div>
          </div>
          <MatchUp match={match} style='list'/>
        </div>
      )}
    </Box>
  )
}

export default MatchListMobile