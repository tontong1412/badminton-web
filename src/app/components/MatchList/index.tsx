import { Match, MatchStatus } from '@/type'
import MatchCard from './MatchCard'
import { Dispatch, SetStateAction } from 'react'


interface MatchListProps {
  matchList: Match[]
  status: MatchStatus
  setMatchList: Dispatch<SetStateAction<Match[]>>;
}

const MatchList = ({ matchList, setMatchList }: MatchListProps) => {
  return (
    <div>
      {matchList.map((match) => (
        <MatchCard key={match.id} match={match} setMatchList={setMatchList}/>
      ))}
    </div>
  )
}
export default MatchList