import { MAP_GROUP_NAME, MAP_ROUND_NAME } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { Language, Match, MatchStep } from '@/type'
import { ArrowDropDown } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Box, Divider, Typography } from '@mui/material'
import { useSelector } from 'react-redux'

interface MatchCardProps {
  match: Match
}

const MatchCard = ({ match }: MatchCardProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  if(match.round === undefined) return null
  return(
    <Accordion>
      <AccordionSummary expandIcon={<ArrowDropDown />}>
        <Box sx={{ display:'flex', gap:1 }}>
          <Typography component="div">
            {match.step === MatchStep.Group ? `Round ${match.round + 1}` : MAP_ROUND_NAME[match.round.toString() as keyof typeof MAP_ROUND_NAME]}
          </Typography>
          {(match.step === MatchStep.Group && match.groupOrder !== undefined) && <Typography component="div">
            {`of group ${MAP_GROUP_NAME[match.groupOrder].NAME}`}
          </Typography>}
        </Box>
      </AccordionSummary>
      <Divider/>
      <AccordionDetails>
        {match.teamA &&
        <Box component="div">
          {match.teamA.players.map((p) => <Typography key={p.id}>{p.officialName[language]}</Typography>)}
        </Box>}
        {match.teamB &&
        <Box component="div" sx={{ mt:1 }}>
          {match.teamB.players.map((p) => <Typography key={p.id}>{p.officialName[language]}</Typography>)}
        </Box>}
      </AccordionDetails>
    </Accordion>


  )
}
export default MatchCard


// <Card sx={{ minWidth: 200 }}>
//   <CardContent >
//     <Box sx={{ display:'flex', gap:1 }}>
//       <Typography component="div">
//         {`Round ${match.round}`}
//       </Typography>
//       {(match.step === MatchStep.Group && match.groupOrder !== undefined) && <Typography component="div">
//         {`of group ${MAP_GROUP_NAME[match.groupOrder].NAME}`}
//       </Typography>}
//     </Box>
//     {match.teamA && <Box>
//       <Typography>{match.teamA.players[0].officialName.th}</Typography>
//     </Box>}
//     {match.teamB && <Box>
//       <Typography>{match.teamB.players[0].officialName.th}</Typography>
//     </Box>}

//   </CardContent>
// </Card>