import React from 'react'
import moment from 'moment'
import { Language, Match } from '@/type'
import { Typography } from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'
import stylesBracket from './Bracket.module.scss'
import styleMatchList from './MatchList.module.scss'

interface MatchUpProps {
  match: Match
  style: 'bracket' | 'list'
  placeholderTeamA?: string
  placeholderTeamB?: string
}

const MatchUp = ({ match, style = 'bracket', placeholderTeamA, placeholderTeamB }: MatchUpProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const styles = style === 'bracket' ? stylesBracket : styleMatchList

  const renderTeamName = (team: Match['teamA'], placeholder?: string, isBye?: boolean) => {
    if (team?.players && team.players.length > 0) {
      return team.players.map((p) => <Typography key={`player-${p.id}`}>{p.officialName?.[language]}</Typography>)
    }
    if (placeholder) return <Typography>{placeholder}</Typography>
    if (isBye) return <Typography>Bye</Typography>
    return null
  }

  const participantClassName = (
    team: Match['teamA'],
    isWinner: boolean | undefined,
    isLoser: boolean | undefined,
    placeholder?: string,
    isBye?: boolean
  ) => {
    const shouldCenterSingleLine = team?.players?.length === 1
      || (!!placeholder && (!team?.players || team.players.length === 0))
      || (!!isBye && (!team?.players || team.players.length === 0))

    return [
      styles.participant,
      isWinner ? styles.winner : '',
      isLoser ? styles.loser : '',
      shouldCenterSingleLine ? styles.singlePlayer : ''
    ].filter(Boolean).join(' ')
  }

  const renderMatchDetail = (match: Match, team: 'teamA'| 'teamB', teamIndex: number) => {
    if (match.status === 'waiting') return (
      <div className={styles['detail-date']}>
        <p>{`#${match.matchNumber}\r\n${moment(match.date).format('DD/MM/YYYY')}`}</p>
      </div>
    )
    return (
      <React.Fragment>
        {match.scoreLabel.map((set: string, i: number) => <div key={i} className={styles['detail-score']}><p>{set.split('-')[teamIndex]}</p></div>)}
        {match.status === 'playing' && <div className={styles['detail-score']}><p>{match[team]?.score}</p></div>}
        {match.status === 'finished' && match.scoreLabel.length < 3 && [...Array.from({ length: 3 - match.scoreLabel.length })].map((i, idx) => <div key={idx} className={styles['detail-score']}><p></p></div>)}
        {match.status === 'playing' && match.scoreLabel.length < 2 && [...Array.from({ length: 2 - match.scoreLabel.length })].map((i, idx) => <div key={idx} className={styles['detail-score']}><p></p></div>)}
      </React.Fragment>
    )
  }
  return (
    <div onClick={() => console.log(match.bracketOrder)} className={styles.matchup}>
      <div className={styles.participants} >
        {/* <div className="participants" onClick={() => setModalVisible(true)}> */}
        <div className={styles.group}>
          <div className={participantClassName(
            match.teamA,
            Boolean(match.status === 'finished' && (match.teamA?.scoreSet > match.teamB?.scoreSet || (match.skip === true && match.byePosition === 0))),
            Boolean(match.status === 'finished' && !(match.teamA?.scoreSet > match.teamB?.scoreSet || (match.skip === true && match.byePosition === 0))),
            placeholderTeamA,
            match.skip === true && match.byePosition === 0
          )}>
            {renderTeamName(match.teamA, placeholderTeamA, match.skip === true && match.byePosition === 0)}
          </div>
          {
            !match.matchNumber || match.status === 'playing' || (match.scoreLabel && match.scoreLabel.length) > 0
              ? renderMatchDetail(match, 'teamA', 0)
              : <div className={styles['detail-date']}>
                <p>{`#${match.matchNumber}\r\n${moment(match.date).format('DD/MM/YYYY')}`}</p>
              </div>
          }
        </div>
        <div className={styles.group}>
          <div className={participantClassName(
            match.teamB,
            Boolean(match.status === 'finished' && (match.teamB?.scoreSet > match.teamA?.scoreSet || (match.skip === true && match.byePosition === 1))),
            Boolean(match.status === 'finished' && !(match.teamB?.scoreSet > match.teamA?.scoreSet || (match.skip === true && match.byePosition === 1))),
            placeholderTeamB,
            match.skip === true && match.byePosition === 1
          )}>
            {renderTeamName(match.teamB, placeholderTeamB, match.skip === true && match.byePosition === 1)}
          </div>
          {
            !match.matchNumber || match.status === 'playing' || (match.scoreLabel && match.scoreLabel.length) > 0
              ? renderMatchDetail(match, 'teamB', 1)
              : <div className={styles['detail-time']}><p>{moment(match.date).format('H.mm')}</p></div>
          }
        </div>
      </div>
    </div >
  )
}
export default MatchUp
