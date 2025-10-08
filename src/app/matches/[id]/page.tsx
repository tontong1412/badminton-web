'use client'
import Layout from '@/app/components/Layout'
import { useMatch } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Language, Match, MatchStatus } from '@/type'
import { Add } from '@mui/icons-material'
import { Avatar, Box, Button, CircularProgress, Container, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import SettingMatchDialog from './SettingDialog'
import { SERVICE_ENDPOINT } from '@/app/constants'
import axios from 'axios'

const MatchPage = () => {
  const params = useParams()
  const { match, isLoading, mutate } = useMatch(params.id as string)
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [isUmpire, setIsUmpire] = useState(false)
  const [side, setSide] = useState(true)
  const [settingModalVisible, setSettingModalVisible] = useState(false)
  const [undo, setUndo] = useState<Match[]>([])
  const [isSingle, setIsSingle] = useState(false)
  const [endMatchEnable, setEndMatchEnable] = useState(false)


  useEffect(() => {
    if(match && user && user.player.id === match.umpire?.id){
      setIsUmpire(true)
    }else{
      setIsUmpire(false)
    }
  }, [user, match])

  useEffect(() => {
    setIsSingle(match?.teamA.players.length === 1)
  }, [match])

  const updateScore = async(team: 'A'|'B') => {
    setEndMatchEnable(false)
    const keepForUndo = [
      ...undo,
      match
    ]
    setUndo(keepForUndo)
    let payload
    if (team === 'A') {
      const currentScore = match.teamA.score
      let teamBReceiver

      if (match.teamB.score % 2 === 0 && (currentScore + 1) % 2 === 0) {
        teamBReceiver = match.teamB.serving
      } else if (match.teamB.score % 2 === 1 && (currentScore + 1) % 2 === 1) {
        teamBReceiver = match.teamB.serving
      } else {
        teamBReceiver = Math.abs(match.teamB.serving - 1)
      }
      payload = {
        $inc: { 'teamA.score': 1 },
        'teamA.serving': isSingle ? 0 : (match.teamA.isServing ? match.teamA.serving : Math.abs(match.teamA.serving - 1)),
        'teamA.receiving': null,
        'teamB.receiving': isSingle ? 0 : teamBReceiver,
        'teamA.isServing': true,
        'teamB.isServing': false
      }
    } else {
      const currentScore = match.teamB.score
      let teamAReceiver
      if (match.teamA.score % 2 === 0 && (currentScore + 1) % 2 === 0) {
        teamAReceiver = match.teamA.serving
      } else if (match.teamA.score % 2 === 1 && (currentScore + 1) % 2 === 1) {
        teamAReceiver = match.teamA.serving
      } else {
        teamAReceiver = Math.abs(match.teamA.serving - 1)
      }
      payload = {
        $inc: { 'teamB.score': 1 },
        'teamB.serving': isSingle ? 0 : (match.teamB.isServing ? match.teamB.serving : Math.abs(match.teamB.serving - 1)),
        'teamB.receiving': null,
        'teamA.receiving': isSingle ? 0 : teamAReceiver,
        'teamB.isServing': true,
        'teamA.isServing': false
      }
    }
    const response = await axios.put(`${SERVICE_ENDPOINT}/matches/${match.id}`, payload, { withCredentials:true })
    mutate(response.data)
  }

  const onUndo = async() => {
    const prev = undo.pop()
    const response = await axios.put(`${SERVICE_ENDPOINT}/matches/${match.id}`, prev, { withCredentials:true })
    mutate(response.data)
  }

  const endGame = async() => {
    const scoreLabel = [...match.scoreLabel]
    scoreLabel.push(`${match.teamA.score}-${match.teamB.score}`)
    await axios.post(`${SERVICE_ENDPOINT}/matches/set-score`, {
      matchID: match.id,
      score: scoreLabel,
      status: MatchStatus.Playing
    }, { withCredentials:true })

    const response  = await axios.put(`${SERVICE_ENDPOINT}/matches/${match.id}`, {
      'teamA.score': 0,
      'teamB.score': 0,
      'teamA.isServing': match.teamA.score > match.teamB.score,
      'teamB.isServing': match.teamB.score > match.teamA.score,
      'teamA.serving': match.teamA.score > match.teamB.score ? 0 : null,
      'teamB.serving': match.teamB.score > match.teamA.score ? 0 : null,
      'teamA.receiving': 0,
      'teamB.receiving': 0,
    }, { withCredentials :true })
    setUndo([])
    setSide(!side)
    mutate(response.data)
    setEndMatchEnable(true)
  }

  const endMatch = async() => {
    const response = await axios.put(`${SERVICE_ENDPOINT}/matches/${match.id}`, {
      status: MatchStatus.Finished
    }, { withCredentials:true })
    mutate(response.data)
  }


  if(!match || isLoading) return <CircularProgress/>
  return (
    <Layout noFooter>
      <Container>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: side ? 'row-reverse' : 'row',
          mt:2
        }}>
          <Box style={{ width: '35%' }}>
            {match?.teamA?.players.map((player, index) => {
              return (
                <Box
                  key={`teamA-${player.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '5px',
                    fontSize: '20px',
                    flexDirection: side ? 'row-reverse' : 'row'
                  }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '20px', overflow: 'hidden', objectFit: 'contain' }}>
                    <Avatar src={player.photo} alt='avatar' />
                  </div>
                  <div>{player.officialName[language]}</div>
                  {match.teamA.serving === index && match.teamA.isServing && <div style={{ padding: '2px 5px', backgroundColor: '#80644f', borderRadius: '5px', color: 'white' }}>S</div>}
                  {match.teamA.receiving === index && !match.teamA.isServing && <div style={{ padding: '2px 5px', backgroundColor: '#80644f', borderRadius: '5px', color: 'white'   }}>R</div>}
                </Box>
              )
            })}

          </Box>

          <Box sx={{
            width: '20%',
            textAlign: 'center',
          }}>
            <Box >
              {
                match.scoreLabel.map((set, i) => {
                  const setElm = set.split('-')
                  setElm.splice(1, 0, '-')
                  return (
                    <div key={i + 1} style={{ display: 'flex', flexDirection: side ? 'row-reverse' : 'row', gap: '5px', justifyContent: 'center' }}>
                      {setElm.map((elm, j) => <Typography key={j + 1}>{elm}</Typography>)}
                    </div>
                  )

                })
              }
            </Box>

            {match.status != MatchStatus.Finished &&
            <Box style={{
              justifyContent: 'space-between',
              flexDirection: side ? 'row-reverse' : 'row',
              fontSize: '40px',
              display: 'flex',
            }}>
              <div style={{ width: 65 }}>{match.teamA.score}</div>
              <div style={{ width: 20 }}>-</div>
              <div style={{ width: 65 }}>{match.teamB.score}</div>
            </Box>}
          </Box>

          <Box sx={{ width: '35%' }}>
            {match?.teamB?.players.map((player, index) => {
              return (
                <Box
                  key={`teamB-${player.id}`}
                  sx={{
                    flexDirection: side ? 'row' : 'row-reverse',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '5px',
                    fontSize: '20px'
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '20px', overflow: 'hidden', objectFit: 'contain' }}>
                    <Avatar src={player.photo} alt='player' />
                  </div>
                  <div className='info' style={{ marginRight: '5px', marginLeft: 0, textAlign: 'right' }}>{player.officialName[language]}</div>
                  {match.teamB.serving === index && match.teamB.isServing && <div style={{ padding: '2px 5px', backgroundColor: '#80644f', borderRadius: '5px', color: 'white' }}>S</div>}
                  {match.teamB.receiving === index && !match.teamB.isServing && < div style={{ padding: '2px 5px', backgroundColor: '#80644f', borderRadius: '5px', color: 'white' }}>R</div>}
                </Box>
              )
            })}
          </Box>
        </Box>

        <Box>
          <div style={{ textAlign: 'center', fontSize: '20px' }}>แมตช์ที่: {match.matchNumber}</div>
          {match.umpire && <div style={{ textAlign: 'center', fontSize: '20px' }}>จำนวนลูก: {match.shuttlecockUsed} ลูก</div>}
          {match.umpire && <div style={{ textAlign: 'center', fontSize: '20px' }}>ผู้ตัดสิน: {match.umpire?.officialName[language]}</div>}
        </Box>

        {isUmpire && match.status === MatchStatus.Playing &&
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            flexDirection: side ? 'row-reverse' : 'row',
            mt:2
          }}
        >
          <Button
            variant='contained'
            style={{
              width: 100,
              height: 50,
              borderRadius: 10,
              fontSize: '50px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={() => updateScore('A')}
          >
            <Add/>
          </Button>
          <Box>
            <div style={{ textAlign: 'center', display: 'flex', gap: '10px' }}>
              <Button onClick={() => setSide(!side)} variant='outlined'>สลับข้าง</Button>
              {match.teamA.score === 0 && match.teamB.score === 0 &&
              <Button variant='outlined' onClick={() => setSettingModalVisible(true)}>เลือกคนรับ/เสิร์ฟ</Button>
              }
              <Button
                variant='outlined'
                color='error'
                onClick={endGame}
              >จบเกม
              </Button>
              <Button disabled={undo.length <= 0} onClick={onUndo} variant='outlined'>undo</Button>
            </div>
            {/* <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', paddingTop: '10px' }}>
              <Button style={{ width: '50%' }} onClick={() => manageShuttlecock('decrement')}>ลบลูก</Button>
              <Button style={{ width: '50%' }} onClick={() => manageShuttlecock('increment')}>เพิ่มลูก</Button>
            </div> */}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '10px', pt: '20px' }}>
              <Button
                style={{ width: '100%' }}
                color='error'
                variant='contained'
                onClick={endMatch}
                disabled={!endMatchEnable}
              >
                จบแมตช์
              </Button>
            </Box>
          </Box>
          <Button
            variant='contained'
            style={{
              width: 100,
              height: 50,
              borderRadius: 10,
              fontSize: '50px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={() => updateScore('B')}
          >
            <Add/>
          </Button>
        </Box>}


      </Container>
      {settingModalVisible && <SettingMatchDialog
        visible={settingModalVisible}
        setVisible={setSettingModalVisible}
        match={match}
        setMatch={mutate}/>}
    </Layout>
  )
}
export default MatchPage