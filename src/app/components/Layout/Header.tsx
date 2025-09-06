'use client'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuIcon from '@mui/icons-material/Menu'
import Container from '@mui/material/Container'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import MenuItem from '@mui/material/MenuItem'
import { useState, MouseEvent, useEffect } from 'react'
import { RootState, useAppDispatch } from '@/app/libs/redux/store'
import { login, logout } from '@/app/libs/redux/slices/appSlice'
// import { useRouter } from 'next/navigation'
import LoginModal from '../LoginModal'
import LanguageSettingModal from '../LanguageSettingModal'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '@/app/constants'
import { useSelector } from '@/app/providers'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

interface Page {
  name: string;
  action: string;
}

const pages: Page[] = [
  {
    name: 'Home',
    action: '/'
  },
  {
    name: 'Tournament',
    action: '/tournaments'
  }
]
const settings: string[] = [
  // 'View Profile',
  // 'Account',
  'Language Setting',
  'Logout'
]

const  ResponsiveAppBar = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const [languageSettingModal, setLanguageSettingModal] = useState(false)
  const user = useSelector((state: RootState) => state.app.user)
  const dispatch = useAppDispatch()
  // const router = useRouter()
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null)
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null)

  useEffect(() => {
    const getUser = async() => {
      try{
        const response = await axios.post(`${SERVICE_ENDPOINT}/users/refresh-token`, {}, { withCredentials: true })
        const userObj = {
          id: response.data.user.id,
          email: response.data.user.email,
          player: response.data.player
        }
        dispatch(login(userObj))
      }catch(err){
        console.log('Error fetching user data:', err)
      }
    }
    getUser()
  }, [])

  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => {
    if(pages.length > 0){
      setAnchorElNav(event.currentTarget)
    }
  }
  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) => {
    if(settings.length > 0){
      setAnchorElUser(event.currentTarget)
    }
  }

  const handleCloseNavMenu = (action: string) => {
    router.push(action)
    setAnchorElNav(null)
  }

  const handleCloseUserMenu = async(selectedMenu: string) => {
    switch(selectedMenu){
    case 'Logout':
      await axios.post(`${SERVICE_ENDPOINT}/users/logout`, { userId: user?.id }, { withCredentials: true })
      dispatch(logout())
      break
    case 'Language Setting':
      setLanguageSettingModal(true)
      break
    default:
    }
    setAnchorElUser(null)
  }

  const renderAvatarSetting = () => {
    return (
      <Box sx={{ flexGrow: 0 }}>
        <Tooltip title="Open settings">
          <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
            <Avatar alt="profile-picture" src={user?.player.photo || '/avatar.png'} />
          </IconButton>
        </Tooltip>
        <Menu
          sx={{ mt: '45px' }}
          id="menu-appbar"
          anchorEl={anchorElUser}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorElUser)}
          onClose={handleCloseUserMenu}
        >
          {settings.map((setting) => (
            <MenuItem key={setting} onClick={() => handleCloseUserMenu(setting)}>
              <Typography sx={{ textAlign: 'center' }} >{setting}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>
    )
  }

  const renderLoginButton = () => {
    return(
      <Box sx={{ flexGrow: 0 }}>
        <Tooltip title="Open settings">
          <Typography sx={{ textAlign: 'center' }} onClick={() => setLoginModalVisible(true)}>{t('action.login')}</Typography>
        </Tooltip>
      </Box>
    )
  }

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'Nunito',
              fontWeight: 400,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            BADMINSTAR
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>

            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {pages.map((page) => (
                <MenuItem key={page.name} onClick={() => handleCloseNavMenu(page.action)}>
                  <Typography sx={{ textAlign: 'center' }} >{page.name}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Typography
            variant="h5"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'nunito',
              fontWeight: 400,
              letterSpacing: '.2rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            BADMINSTAR
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button
                key={page.name}
                onClick={() => handleCloseNavMenu(page.action)}
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                {page.name}
              </Button>
            ))}
          </Box>

          {user ? renderAvatarSetting() : renderLoginButton()}

        </Toolbar>
      </Container>
      <LoginModal visible={loginModalVisible} setVisible={setLoginModalVisible}/>
      <LanguageSettingModal visible={languageSettingModal} setVisible={setLanguageSettingModal}/>
    </AppBar>
  )
}
export default ResponsiveAppBar

