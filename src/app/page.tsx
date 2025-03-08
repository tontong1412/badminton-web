'use client'
import { Button, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'


const Home = () => {
  const router = useRouter()
  return (
    <div>
      <Typography sx={{ mt: 4, mb: 2 }} variant="h6" component="div">
        Badminstar
      </Typography>
      <Button data-test-id='button-to-session' variant='contained' size="large" onClick={() => router.push('/sessions')}>Host a Session</Button>
    </div>
  )
}

export default Home
