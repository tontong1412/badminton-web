'use client'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { Match, MatchStatus } from '@/type'
import MatchList from '@/app/components/MatchList'
import { fetchMatches } from '@/app/libs/fetchData'
import FloatingAddButton from '@/app/components/FloatingAddButton'
import AddQueueModal from '@/app/components/AddQueueModal'

const MatchQueue = () => {
  const [value, setValue] = useState<number>(0)
  const [matchList, setMatchList] = useState<Match[]>([])
  const [addQueueModalVisible, setAddQueueModalVisible] = useState<boolean>(false)

  useEffect(() => {
    const matches = fetchMatches()
    setMatchList(matches)
  }, [])

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const renderTab = () => {
    switch (value){
    case (0): {
      const matches = matchList.filter((match) => match.status === MatchStatus.Waiting)
      return <MatchList status={MatchStatus.Waiting} matchList={matches} setMatchList={setMatchList}/>
    }
    case (1):{
      const matches = matchList.filter((match) => match.status === MatchStatus.Playing)
      return <MatchList status={MatchStatus.Playing} matchList={matches} setMatchList={setMatchList}/>
    }
    case (2):{
      const matches = matchList.filter((match) => match.status === MatchStatus.Finished)
      return <MatchList status={MatchStatus.Finished} matchList={matches} setMatchList={setMatchList}/>
    }
    default:
      return <MatchList status={MatchStatus.Waiting} matchList={matchList} setMatchList={setMatchList}/>
    }
  }
  return (
    <Box>
      <Tabs value={value} onChange={handleChange} aria-label="Match status tab">
        <Tab label="Waiting" />
        <Tab label="Playing" />
        <Tab label="Finished" />
      </Tabs>
      {renderTab()}
      <FloatingAddButton onClick={() => setAddQueueModalVisible(true)}/>
      <AddQueueModal
        visible={addQueueModalVisible}
        setVisible={setAddQueueModalVisible}
        setMatchList={setMatchList}
      />
    </Box>
  )
}
export default MatchQueue