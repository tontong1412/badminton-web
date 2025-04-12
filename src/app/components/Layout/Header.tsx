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
import { useSelector } from 'react-redux'
import { RootState, useAppDispatch } from '@/app/libs/redux/store'
import { login, logout } from '@/app/libs/redux/slices/appSlice'
// import { useRouter } from 'next/navigation'
import LoginModal from '../LoginModal/page'
import LanguageSettingModal from '../LanguageSettingModal'

const pages: string[] = ['Tournament']
const settings: string[] = ['View Profile', 'Account', 'Language Setting', 'Logout']

const  ResponsiveAppBar = () => {
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const [languageSettingModal, setLanguageSettingModal] = useState(false)
  const user = useSelector((state: RootState) => state.app.user)
  const dispatch = useAppDispatch()
  // const router = useRouter()
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null)
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null)

  useEffect(() => {
    if(!user){
      const retreivedUser = localStorage.getItem('login')
      if(!retreivedUser) return
      dispatch(dispatch(login(JSON.parse(retreivedUser))))
    }
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

  const handleCloseNavMenu = () => {
    setAnchorElNav(null)
  }

  const handleCloseUserMenu = (selectedMenu: string) => {
    switch(selectedMenu){
    case 'Logout':
      localStorage.clear()
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
            <Avatar alt="Remy Sharp" src="/avatar.png" />
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
          <Typography sx={{ textAlign: 'center' }} onClick={() => setLoginModalVisible(true)}>Log in</Typography>
        </Tooltip>
      </Box>
    )
  }

  return (
    <AppBar position="static">
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
                <MenuItem key={page} onClick={handleCloseNavMenu}>
                  <Typography sx={{ textAlign: 'center' }}>{page}</Typography>
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
                key={page}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                {page}
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
