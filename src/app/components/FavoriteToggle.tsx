'use client'

import { Favorite, FavoriteBorder } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { FavoriteItemType } from '@/type'
import { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import useFavorites from '../libs/useFavorites'

interface FavoriteToggleProps {
  itemType: FavoriteItemType;
  itemID: string;
  onRequireLogin?: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const FavoriteToggle = ({
  itemType,
  itemID,
  onRequireLogin,
  size = 'small',
  color = '#ff7961',
}: FavoriteToggleProps) => {
  const { t } = useTranslation()
  const { isFavorited, toggleFavorite, isPending } = useFavorites()

  const favorited = isFavorited(itemType, itemID)
  const pending = isPending(itemType, itemID)

  const handleClick = async(event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (pending) return
    await toggleFavorite(itemType, itemID, onRequireLogin)
  }

  return (
    <Tooltip title={favorited ? t('favorite.remove') : t('favorite.add')}>
      <span>
        <IconButton
          onClick={handleClick}
          size={size}
          disabled={pending}
          sx={{
            color,
            bgcolor: 'transparent',
            '&:hover': {
              bgcolor: 'transparent',
            },
          }}
        >
          {favorited ? <Favorite fontSize={size} /> : <FavoriteBorder fontSize={size} />}
        </IconButton>
      </span>
    </Tooltip>
  )
}

export default FavoriteToggle
