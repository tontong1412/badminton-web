import { Match, MatchStatus } from '@/type'

export const getDisplayedScores = (match: Match) => {
  if(match.status !== MatchStatus.Playing){
    return match.scoreLabel
  }

  return [...match.scoreLabel, `${match.teamA.score}-${match.teamB.score}`]
}