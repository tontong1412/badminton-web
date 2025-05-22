'use client'
import { RootState, useAppDispatch } from '@/app/libs/redux/store'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import Box from '@mui/material/Box'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import { useRouter, useParams } from 'next/navigation'
import { TournamentMenu } from '@/type'
import { useTranslation } from 'react-i18next'
import { useSelector } from '@/app/providers'
import { FormatListBulleted, InfoOutlined, Person, Polyline, Settings } from '@mui/icons-material'

interface Props {
  isManager: boolean
}

const TournamentFooter = ({ isManager }: Props) => {
  const router = useRouter()
  const params = useParams()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const activeMenu = useSelector((state: RootState) => state.app.activeMenu)

  return (
    <Box>
      <BottomNavigation
        className="fixed bottom-0 left-0 w-full"
        showLabels
        value={Object.values(TournamentMenu).includes(activeMenu as TournamentMenu) ? activeMenu : TournamentMenu.Info}
        onChange={(event, newValue) => {
          dispatch(setActiveMenu(newValue))
          switch (newValue) {
          case TournamentMenu.Info:
            router.push(`/tournaments/${params.id}`)
            break
          case TournamentMenu.Participants:
            router.push(`/tournaments/${params.id}/participants`)
            break
          case TournamentMenu.Me:
            router.push(`/tournaments/${params.id}/me`)
            break
          default:
            break
          }
        }}
      >
        <BottomNavigationAction label={t('tournament.menu.info')} value={TournamentMenu.Info} icon={<InfoOutlined />} />
        <BottomNavigationAction label={t('tournament.menu.participants')} value={TournamentMenu.Participants} icon={<Polyline />} />
        <BottomNavigationAction label={t('tournament.menu.matches')} value={TournamentMenu.Matches} icon={<FormatListBulleted />} />
        <BottomNavigationAction label={t('tournament.menu.me')} value={TournamentMenu.Me} icon={<Person />} />
        {isManager && <BottomNavigationAction label={t('tournament.menu.manage')} value={TournamentMenu.Organize} icon={<Settings />} />}
      </BottomNavigation>
    </Box>
  )
}
export default TournamentFooter
