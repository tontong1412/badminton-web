'use client'
import { Button, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from './libs/redux/store'


const Home = () => {
  const router = useRouter()
  const user = useSelector((state: RootState) => state.app.user)
  console.log(user)
  return (
    <div>
      <Typography sx={{ mt: 4, mb: 2 }} variant="h6" component="div">
        Badminstar
      </Typography>
      <h3>Hello, {user?.player.displayName?.local || user?.player.officialName.local}</h3>
      <Button data-test-id='button-to-session' variant='contained' size="large" onClick={() => router.push('/sessions')}>Host a Session</Button>
    </div>
  )
}

export default Home
