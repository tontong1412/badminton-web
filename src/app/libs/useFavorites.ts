'use client'

import { FavoriteItem, FavoriteItemType } from '@/type'
import { useCallback, useMemo, useState } from 'react'
import { useSelector, useAppDispatch } from '../providers'
import { RootState } from './redux/store'
import { login } from './redux/slices/appSlice'
import playersService from '../services/players'

const uniqueFavorites = (favorites: FavoriteItem[]): FavoriteItem[] => {
  const map = new Map<string, FavoriteItem>()
  favorites.forEach((favorite) => {
    map.set(`${favorite.itemType}:${favorite.itemID}`, favorite)
  })
  return Array.from(map.values())
}

const sortFavorites = (favorites: FavoriteItem[]): FavoriteItem[] => {
  return [...favorites].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
}

export const useFavorites = () => {
  const dispatch = useAppDispatch()
  const user = useSelector((state: RootState) => state.app.user)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())

  const favorites = useMemo(() => {
    return sortFavorites(uniqueFavorites(user?.player?.favorites ?? []))
  }, [user?.player?.favorites])

  const isFavorited = useCallback((itemType: FavoriteItemType, itemID: string) => {
    return favorites.some((favorite) => favorite.itemType === itemType && favorite.itemID === itemID)
  }, [favorites])

  const isPending = useCallback((itemType: FavoriteItemType, itemID: string) => {
    return pendingKeys.has(`${itemType}:${itemID}`)
  }, [pendingKeys])

  const toggleFavorite = useCallback(async(
    itemType: FavoriteItemType,
    itemID: string,
    onRequireLogin?: () => void,
  ): Promise<boolean> => {
    if (!user?.player?.id) {
      onRequireLogin?.()
      return false
    }

    const favoriteKey = `${itemType}:${itemID}`
    const currentlyFavorited = favorites.some((favorite) => favorite.itemType === itemType && favorite.itemID === itemID)
    const nextFavorites = currentlyFavorited
      ? favorites.filter((favorite) => !(favorite.itemType === itemType && favorite.itemID === itemID))
      : [{ itemType, itemID, addedAt: new Date().toISOString() }, ...favorites]

    const normalizedNext = sortFavorites(uniqueFavorites(nextFavorites))
    const previousUser = user

    setPendingKeys((prev) => {
      const next = new Set(prev)
      next.add(favoriteKey)
      return next
    })

    dispatch(login({
      ...user,
      player: {
        ...user.player,
        favorites: normalizedNext,
      },
    }))

    try {
      const updatedPlayer = await playersService.updateMe(user.player.id, { favorites: normalizedNext })
      dispatch(login({ ...previousUser, player: updatedPlayer }))
      return true
    } catch (error) {
      console.error('Failed to update favorites:', error)
      dispatch(login(previousUser))
      return false
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev)
        next.delete(favoriteKey)
        return next
      })
    }
  }, [dispatch, favorites, user])

  return {
    favorites,
    isFavorited,
    isPending,
    toggleFavorite,
  }
}

export default useFavorites
