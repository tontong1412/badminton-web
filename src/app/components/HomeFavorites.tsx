'use client'

import { FavoriteItemType, Language, Tournament, Venue } from '@/type'
import {
  Avatar,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from '../providers'
import { RootState } from '../libs/redux/store'
import venuesService from '../services/venues'
import tournamentsService from '../services/tournaments'
import FavoriteToggle from './FavoriteToggle'
import useFavorites from '../libs/useFavorites'

type FavoriteResolvedItem =
  | { itemType: FavoriteItemType.Venue; itemID: string; venue: Venue }
  | { itemType: FavoriteItemType.Tournament; itemID: string; tournament: Tournament }

const HomeFavorites = () => {
  const avatarSize = 92
  const router = useRouter()
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { favorites } = useFavorites()

  const [items, setItems] = useState<FavoriteResolvedItem[]>([])
  const [loading, setLoading] = useState(false)

  const favoriteKey = useMemo(() => favorites.map((favorite) => `${favorite.itemType}:${favorite.itemID}`).join('|'), [favorites])

  useEffect(() => {
    const loadFavorites = async() => {
      if (favorites.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      setLoading(true)

      const venueIDs = favorites
        .filter((favorite) => favorite.itemType === FavoriteItemType.Venue)
        .map((favorite) => favorite.itemID)

      const tournamentIDs = favorites
        .filter((favorite) => favorite.itemType === FavoriteItemType.Tournament)
        .map((favorite) => favorite.itemID)

      const [venueResults, tournamentResults] = await Promise.all([
        Promise.allSettled(venueIDs.map((id) => venuesService.getById(id))),
        Promise.allSettled(tournamentIDs.map((id) => tournamentsService.getById(id))),
      ])

      const venueMap = new Map<string, Venue>()
      venueResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.id) {
          venueMap.set(String(result.value.id), result.value)
        }
      })

      const tournamentMap = new Map<string, Tournament>()
      tournamentResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.id) {
          tournamentMap.set(String(result.value.id), result.value)
        }
      })

      const resolved: FavoriteResolvedItem[] = []
      favorites.forEach((favorite) => {
        if (favorite.itemType === FavoriteItemType.Venue) {
          const venue = venueMap.get(favorite.itemID)
          if (venue) {
            resolved.push({ itemType: FavoriteItemType.Venue, itemID: favorite.itemID, venue })
          }
          return
        }

        const tournament = tournamentMap.get(favorite.itemID)
        if (tournament) {
          resolved.push({ itemType: FavoriteItemType.Tournament, itemID: favorite.itemID, tournament })
        }
      })

      setItems(resolved)
      setLoading(false)
    }

    loadFavorites()
  }, [favoriteKey, favorites])

  return (
    <Box maxWidth="xl" sx={{ mt: 1, mb: 3 }}>
      <Typography gutterBottom variant="h5" component="div">
        {t('favorite.title')}
      </Typography>

      {loading ? (
        <CircularProgress size={24} />
      ) : items.length === 0 ? (
        <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
          {t('favorite.empty')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, overflowX: 'auto', pb: 0.5 }}>
          {items.map((item) => {
            if (item.itemType === FavoriteItemType.Venue) {
              const name = item.venue.name?.[language] || item.venue.name?.en || item.venue.name?.th
              return (
                <Box
                  key={`venue-${item.itemID}`}
                  onClick={() => router.push(`/venues/${item.itemID}`)}
                  sx={{
                    position: 'relative',
                    width: avatarSize,
                    minWidth: avatarSize,
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ position: 'relative', width: avatarSize, height: avatarSize }}>
                    <Avatar
                      src={item.venue.logo || item.venue.coverImage || '/avatar.png'}
                      alt={name}
                      sx={{ width: avatarSize, height: avatarSize }}
                    />
                    <Box sx={{ position: 'absolute', top: -6, right: -6 }}>
                      <FavoriteToggle
                        itemType={FavoriteItemType.Venue}
                        itemID={item.itemID}
                        backgroundColor="rgba(255,255,255,0.92)"
                      />
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.75,
                      display: 'block',
                      width: avatarSize,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {name}
                  </Typography>
                </Box>
              )
            }

            const tournamentName = item.tournament.name?.[language] || item.tournament.name?.en || item.tournament.name?.th
            return (
              <Box
                key={`tournament-${item.itemID}`}
                onClick={() => router.push(`/tournaments/${item.itemID}`)}
                sx={{
                  position: 'relative',
                  width: avatarSize,
                  minWidth: avatarSize,
                  cursor: 'pointer',
                }}
              >
                <Box sx={{ position: 'relative', width: avatarSize, height: avatarSize }}>
                  <Avatar
                    src={item.tournament.logo || '/avatar.png'}
                    alt={tournamentName}
                    sx={{ width: avatarSize, height: avatarSize }}
                  />
                  <Box sx={{ position: 'absolute', top: -6, right: -6 }}>
                    <FavoriteToggle
                      itemType={FavoriteItemType.Tournament}
                      itemID={item.itemID}
                      backgroundColor="rgba(255,255,255,0.92)"
                    />
                  </Box>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.75,
                    display: 'block',
                    width: avatarSize,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tournamentName}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default HomeFavorites
