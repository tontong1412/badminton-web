import {  Match  } from '@/type'
import { Menu, MenuItem } from '@mui/material'
import { Dispatch, SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AssignMatchModal from './AssignMatchModal'

interface MatchMenuProps {
  match: Match
  setMatch: Dispatch<SetStateAction<Match | null>>
  anchorElMenu: null | HTMLElement
  setAnchorElMenu: Dispatch<SetStateAction<HTMLElement | null>>
  isManager: boolean
  tournamentID: string
}

const MatchMenu = ({ match, setMatch, anchorElMenu, setAnchorElMenu, tournamentID }:MatchMenuProps) => {
  const { t } = useTranslation()
  // const language: Language = useSelector((state: RootState) => state.app.language)
  const [announceModalVisible, setAnnounceModalVisible] = useState(false)
  // const [scoreModalVisible, setScoreModalVisible] = useState(false)


  const handleCloseMenu = () => {
    setAnchorElMenu(null)
    setMatch(null)
  }

  return (
    <>
      <Menu
        id="admin-menu"
        anchorEl={anchorElMenu}
        open={Boolean(anchorElMenu)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          setAnchorElMenu(null)
          setAnnounceModalVisible(true)
        }}>{t('tournament.matchList.action.announce')}
        </MenuItem>

        <MenuItem onClick={() => {
          setAnchorElMenu(null)
          // setScoreModalVisible(true)
        }}>{t('tournament.matchList.action.editResult')}
        </MenuItem>
      </Menu>
      {announceModalVisible && <AssignMatchModal
        visible={announceModalVisible}
        setVisible={setAnnounceModalVisible}
        tournamentID={tournamentID}
        match={match}
      />}
    </>
  )
}
export default MatchMenu