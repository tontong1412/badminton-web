import { Match, MatchPlayer, MatchStatus } from '@/type'
import { Avatar, Typography } from '@mui/material'
import StartMatchModal from '../StartMatchModal'
import { Dispatch, SetStateAction, useState } from 'react'

interface MatchCardProps {
  match: Match
  setMatchList: Dispatch<SetStateAction<Match[]>>;
}

interface PlayerDisplay {
  player: MatchPlayer, reverse?: boolean
}

const PlayerDisplay = ({ player, reverse } : PlayerDisplay) => {
  return (
    <div className={`flex items-center gap-5 p-2 w-[150px] ${reverse && 'flex-row-reverse'}`}>
      <Avatar src={player.photo || '/avatar.png'}/>
      <Typography>{player.displayName || player.officialName}</Typography>
    </div>
  )
}

const MatchCard = ({ match, setMatchList } : MatchCardProps) => {
  const [startMatchModalVisible, setStartMatchModalVisible] = useState<boolean>(false)
  return (
    <div className={'w-auto rounded-md shadow-md border m-1 max-w-sm'}>

      <div className='flex w-auto justify-between p-4 pb-0'>
        <div>
          {match.teamA.team.players.map((player) => <PlayerDisplay key={player.id} player={player}/>)}
        </div>
        <div>
          {match.teamB.team.players.map((player) => <PlayerDisplay key={player.id} player={player} reverse/>)}
        </div>
      </div>

      {
        match.status !== MatchStatus.Waiting &&
        <div className='flex justify-between px-4'>
          <div>Court: {match.court || '-'}</div>
          <div>Shuttlecock: {match.shuttlecockUsed}</div>
        </div>
      }

      <div className='flex justify-between border-t'>
        <div className='w-1/3 text-center p-1 border-r'>
          Edit
        </div>
        <div className='w-1/3 text-center p-1 border-r'>
          Remove
        </div>
        <div className='w-1/3 text-center p-1' onClick={() => setStartMatchModalVisible(true)}>
          Start
        </div>
      </div>
      <StartMatchModal
        visible={startMatchModalVisible}
        setVisible={setStartMatchModalVisible}
        match={match}
        setMatchList={setMatchList}
      />
    </div>
  )
}
export default MatchCard