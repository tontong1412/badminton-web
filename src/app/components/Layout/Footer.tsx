'use client'
import { RootState, useAppDispatch } from '@/app/libs/redux/store'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import Box from '@mui/material/Box'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
// import SettingsIcon from '@mui/icons-material/Settings'
// import GroupIcon from '@mui/icons-material/Group'
// import TocIcon from '@mui/icons-material/Toc'
import { useRouter } from 'next/navigation'
import { AppMenu } from '@/type'
import { useTranslation } from 'react-i18next'
import { useSelector } from '@/app/providers'

const Footer = () => {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const activeMenu = useSelector((state: RootState) => state.app.activeMenu)

  return (
    <Box>
      <BottomNavigation
        className="fixed bottom-0 left-0 w-full"
        showLabels
        value={activeMenu}
        onChange={(event, newValue) => {
          dispatch(setActiveMenu(newValue))
          switch (newValue) {
          case AppMenu.Home:
            router.push('/')
            break
          case AppMenu.Tournament:
            router.push('/tournaments')
            break
          case AppMenu.Setting:
            break
          default:
            break
          }
        }}
      >
        <BottomNavigationAction label={t('footer.home')} value={AppMenu.Home} icon={<HomeIcon />} />
        <BottomNavigationAction label={t('footer.tournament')} value={AppMenu.Tournament} icon={<EmojiEventsIcon />} />
        {/* <BottomNavigationAction label={t('footer.settings')} value={AppMenu.Setting} icon={<SettingsIcon />} /> */}
        {/* <BottomNavigationAction label="Players" value='' icon={<GroupIcon />} />
        <BottomNavigationAction label="Queue" icon={<TocIcon />} /> */}
      </BottomNavigation>
    </Box>
  )
}
export default Footer
