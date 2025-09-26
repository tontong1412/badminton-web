import { useState, useEffect } from 'react'
import MatchUp from './MatchUp'
import { Match, MatchStep } from '@/type'
import { useMatches } from '@/app/libs/data'
import { CircularProgress } from '@mui/material'
import styles from './Bracket.module.scss'

const Connector = () => (
  <div className={styles.connector}>
    <div className={styles.merger}></div>
    <div className={styles.line}></div>
  </div>
)
const Winner = ({ matches }: { matches: Match[] }) => {
  return (
    <div className={styles.winners}>
      <div className={styles.matchups}>
        <MatchUp match={matches[0]} />
        <MatchUp match={matches[1]} />
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
  const { matches, isLoading, isError } = useMatches(eventID)

  useEffect(() => {
    if (matches) {
      const bracketData = matches.filter((m: Match) => m.step === step)
      setBracket(processBracketData(bracketData))
    }
  }, [matches, step])

  const renderBracket = (roundArray: string[], bracket: { [key: string]: Match[] }) => {
    if(bracket === undefined) return
    return (
      <div className={styles.bracket}>
        {
          roundArray.map((round, roundIndex) => {
            console.log(round)
            console.log(styles[round])
            console.log(styles.winners)
            return (
              <section key={`round-${roundIndex}`} className={`${styles.round} ${styles[round]}`}>
                {
                  bracket[round].map((matches: Match, index: number) => {
                    if (round !== 'finals' && index % 2 === 1) {
                      const matchArray = [bracket[round][index - 1], matches]
                      return <Winner key={index + 1} matches={matchArray} />
                    } else if (round === 'finals') {
                      console.log('------------')
                      return (
                        <div key={index + 1} className={styles.winners}>
                          <div className={styles.matchups}>
                            <MatchUp match={matches} />
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
