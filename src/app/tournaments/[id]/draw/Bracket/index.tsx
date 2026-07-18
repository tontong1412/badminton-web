import { useState, useEffect } from 'react'
import MatchUp from './MatchUp'
import { Match, MatchStep } from '@/type'
import { useEvent, useMatchesEvent } from '@/app/libs/data'
import { CircularProgress } from '@mui/material'
import styles from './Bracket.module.scss'

const Connector = () => (
  <div className={styles.connector}>
    <div className={styles.merger}></div>
    <div className={styles.line}></div>
  </div>
)
const Winner = ({
  matches,
  getPlaceholder
}: {
  matches: Match[]
  getPlaceholder: (match: Match, side: 'teamA' | 'teamB') => string | undefined
}) => {
  return (
    <div className={styles.winners}>
      <div className={styles.matchups}>
        <MatchUp
          match={matches[0]}
          style='bracket'
          placeholderTeamA={getPlaceholder(matches[0], 'teamA')}
          placeholderTeamB={getPlaceholder(matches[0], 'teamB')}
        />
        <MatchUp
          match={matches[1]}
          style='bracket'
          placeholderTeamA={getPlaceholder(matches[1], 'teamA')}
          placeholderTeamB={getPlaceholder(matches[1], 'teamB')}
        />
      </div>
      <Connector />
    </div>
  )
}

const processBracketData = (data: Match[]) => {
  data.sort((a, b) => {
    if(a.round === undefined || b.round === undefined) return 0
    if (b.round === a.round) {
      if(a.bracketOrder === undefined || b.bracketOrder === undefined) return 0
      return a.bracketOrder - b.bracketOrder
    }
    return b.round - a.round
  })
  const maxRound = Math.max(...data.map((e) => e.round || 0))
  const bracketData = data.reduce((prev : { [key: string]: Match[]}, curr) => {
    if(curr.round === undefined) return prev
    const roundIndex = Math.log2(maxRound) - Math.log2(curr.round)
    const key = curr.round !== 2 ? `round${roundIndex}` : 'finals'
    if (!prev[key]) {
      prev[key] = []
    }
    prev[key].push(curr)
    return prev
  }, {})
  return bracketData
}

interface BracketProps {
  eventID: string
  step: MatchStep
}
const Bracket = ({ eventID, step }: BracketProps) => {
  const [bracket, setBracket] = useState<{ [key: string]: Match[] }>()
  const [entryRound, setEntryRound] = useState(0)
  const { event } = useEvent(eventID)
  const { matches, isLoading, isError } = useMatchesEvent(eventID)

  useEffect(() => {
    if (matches) {
      const bracketData = matches.filter((m: Match) => m.step === step)
      setEntryRound(Math.max(...bracketData.map((m) => m.round ?? 0), 0))
      setBracket(processBracketData(bracketData))
    }
  }, [matches, step])

  const getPlaceholder = (match: Match, side: 'teamA' | 'teamB') => {
    if (!event || match.round !== entryRound || match.bracketOrder === undefined) {
      return undefined
    }

    const drawOrder = match.bracketOrder * 2 + (side === 'teamA' ? 0 : 1)
    const drawSlots = step === MatchStep.Consolation ? event.draw?.consolation : event.draw?.ko
    const slot = drawSlots?.[drawOrder]

    if (typeof slot !== 'string') {
      return undefined
    }

    const value = slot.trim()
    if (!value || value.toLowerCase() === 'bye') {
      return undefined
    }

    return value
  }

  const renderBracket = (roundArray: string[], bracket: { [key: string]: Match[] }) => {
    if(bracket === undefined) return
    return (
      <div className={styles.bracket}>
        {
          roundArray.map((round, roundIndex) => {
            return (
              <section key={`round-${roundIndex}`} className={`${styles.round} ${styles[round]}`}>
                {
                  bracket[round].map((matches: Match, index: number) => {
                    if (round !== 'finals' && index % 2 === 1) {
                      const matchArray = [bracket[round][index - 1], matches]
                      return <Winner key={index + 1} matches={matchArray} getPlaceholder={getPlaceholder} />
                    } else if (round === 'finals') {
                      return (
                        <div key={index + 1} className={styles.winners}>
                          <div className={styles.matchups}>
                            <MatchUp
                              match={matches}
                              style='bracket'
                              placeholderTeamA={getPlaceholder(matches, 'teamA')}
                              placeholderTeamB={getPlaceholder(matches, 'teamB')}
                            />
                          </div>
                        </div>
                      )
                    }
                  })
                }
              </section>
            )
          })
        }
      </div>
    )
  }

  if (isLoading || !bracket) return <CircularProgress/>
  if (isError) return <div>Error</div>
  const roundArray = Object.keys(bracket)
  return renderBracket(roundArray, bracket)

}
export default Bracket
