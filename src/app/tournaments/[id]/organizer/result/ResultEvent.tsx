import { useMatchesEvent } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Language, MatchStatus, MatchStep } from '@/type'
import { Box, Typography } from '@mui/material'
import { useSelector } from 'react-redux'

const ResultEvent = ({ eventID }: {eventID: string}) => {
  const { matches } = useMatchesEvent(eventID)
  const language: Language = useSelector((state: RootState) => state.app.language)

  const renderFinalist = () => {
    if(!matches) return
    const finalMatch = matches.find((m) => m.step === MatchStep.PlayOff && m.round === 2 && m.status === MatchStatus.Finished)

    if(!finalMatch){
      return <Typography variant='h5'>การแข่งขันยังไม่เสร็จสิ้น</Typography>
    }
    const winner = finalMatch.teamA.scoreSet > finalMatch.teamB.scoreSet ? 'teamA' : 'teamB'
    const runnerup = finalMatch.teamA.scoreSet > finalMatch.teamB.scoreSet ? 'teamB' : 'teamA'
    return(
      <Box>
        <Typography  variant='h5'>ชนะเลิศ</Typography>
        {
          finalMatch[winner].players.map((p) => <Box key={p.id} display={'flex'}>
            <Typography width={180}>{p.officialName[language]}</Typography>
            <Typography>{p.club}</Typography>
          </Box>)
        }
        <Box mt={2}/>
        <Typography variant='h5'>รองชนะเลิศอันดับ 1</Typography>
        {
          finalMatch[runnerup].players.map((p) => <Box key={p.id} display={'flex'}>
            <Typography width={180}>{p.officialName[language]}</Typography>
            <Typography>{p.club}</Typography>
          </Box>)
        }
      </Box>
    )
  }

  const renderSemiFinalist = () => {
    if(!matches) return
    const semiMatch = matches.filter((m) => m.step === MatchStep.PlayOff && m.round === 4 && m.status === MatchStatus.Finished)
    if(semiMatch.length < 2){
      return
    }
    const semifinalist = semiMatch.map((match) => (match.teamA.scoreSet > match.teamB.scoreSet) ? 'teamB' : 'teamA')

    return(
      <Box >
        <Typography  variant='h5'>รองชนะเลิศอันดับ 2</Typography>
        {
          semiMatch.map((match, i) => match[semifinalist[i]].players.map((p) => <Box key={p.id} display={'flex'}>
            <Typography width={180}>{p.officialName[language]}</Typography>
            <Typography>{p.club}</Typography>
          </Box>)
          )
        }
      </Box>
    )
  }

  return (
    <Box>
      <Box>
        {renderFinalist()}
        <Box mt={2}/>
        {renderSemiFinalist()}
      </Box>
    </Box>
  )

}
export default ResultEvent