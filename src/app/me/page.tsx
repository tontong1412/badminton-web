
'use client'
import { Avatar, Box, Button, Container, Typography } from '@mui/material'
import Layout from '../components/Layout'
import { useSelector } from 'react-redux'
import { RootState } from '../libs/redux/store'
import { Language } from '@/type'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import LoginModal from '../components/LoginModal'

const AccountPage = () => {
  const user = useSelector((state: RootState) => state.app.user)
  const language: Language = useSelector((state: RootState) => state.app.language)
  const router = useRouter()
  const [loginModalVisible, setLoginModalVisible] = useState(false)

  return (
    <Layout>
      <Container>
        {!user
          ? <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Button onClick={() => router.push('/register')} sx={{ borderRadius:10, mt: 2 }} variant='outlined' size='large' color='primary'>Register</Button>
            <Button onClick={() => setLoginModalVisible(true)} sx={{ borderRadius:10, mt: 2 }} variant='contained' size='large' color='primary'>Login</Button>
          </Box>
          : (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', m:2, mt:5 }}>
              <Avatar sx={{ width: 100, height: 100 }} src={user.player.photo}/>
              <Typography variant='h5' mt={2}>{user.player.displayName[language]}</Typography>
              <Typography variant='h6'>{user.player.officialName[language]}</Typography>
              <Button
                sx={{ borderRadius:10, mt: 2 }}
                variant='contained'
                onClick={() => router.push('/me/edit-profile')}
                color='error'>Edit Profile</Button>
            </Box>
          )
        }

      </Container>
      <LoginModal visible={loginModalVisible} setVisible={setLoginModalVisible}/>
    </Layout>

  )
}
export default AccountPage