'use client'
import { useState }from 'react'
import Box from '@mui/material/Box'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import GroupIcon from '@mui/icons-material/Group'
import TocIcon from '@mui/icons-material/Toc'
import SettingsIcon from '@mui/icons-material/Settings'
import { useRouter } from 'next/navigation'

const Footer = () => {
  const [value, setValue] = useState(0)
  const router = useRouter()

  return (
    <Box>
      <BottomNavigation
        className="fixed bottom-0 left-0 w-full"
        showLabels
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue)
          switch (newValue) {
          case 0:
            router.push('/sessions')
            break
          case 1:
            router.push('/sessions/match')
            break
          case 2:
            break
          default:
            break
          }
        }}
      >
        <BottomNavigationAction label="Players" icon={<GroupIcon />} />
        <BottomNavigationAction label="Queue" icon={<TocIcon />} />
        <BottomNavigationAction label="Settings" icon={<SettingsIcon />} disabled/>
      </BottomNavigation>
    </Box>
  )
}
export default Footer
