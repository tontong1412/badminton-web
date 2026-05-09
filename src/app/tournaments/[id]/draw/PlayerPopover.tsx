import { LEVEL } from '@/app/constants'
import { RootState } from '@/app/libs/redux/store'
import { useSelector } from '@/app/providers'
import { Language, Player } from '@/type'
import { Avatar, Box, Chip, Popover, Typography } from '@mui/material'
import { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'

interface Props {
  showPlayer: Player | null
  anchorEl: HTMLDivElement | null
  setShowPlayer: Dispatch<SetStateAction<Player | null>>
  setAnchorEl: Dispatch<SetStateAction<HTMLDivElement | null>>
  useHandicap: boolean
}

const PlayerPopover = ({ showPlayer, anchorEl, setShowPlayer, setAnchorEl, useHandicap }: Props) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  return (
    <Popover
      open={showPlayer !== null}
      anchorEl={anchorEl}
      onClose={() => {
        setShowPlayer(null)
        setAnchorEl(null)
      }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <Box>
        <Box sx={{ width: '300px', m:2, display: 'flex', gap: '5px' }}>
          <a href={showPlayer?.photo}><Avatar src={showPlayer?.photo || '/avatar.png'} sx={{ width: 80, height: 80 }}/></a>
          <Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontSize: 20 }}>
                <Link
                  href={showPlayer ? `/players/${showPlayer.id}` : '#'}
                  onClick={() => {
                    setShowPlayer(null)
                    setAnchorEl(null)
                  }}
                  style={{ textDecoration: 'underline' }}
                >
                  {showPlayer?.officialName[language]}
                </Link>
              </Typography>
              {useHandicap && showPlayer?.level && <Chip label={LEVEL[showPlayer?.level][language]}/>}
            </Box>
            <Typography sx={{ p: 0 }} >{showPlayer?.displayName?.[language]}</Typography>
            <Typography sx={{ p: 0 }} >{showPlayer?.club}</Typography>
          </Box>
        </Box>
      </Box>
    </Popover>
  )
}
export default PlayerPopover