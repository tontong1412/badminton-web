'use client'

import { useTournament } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { Box, CircularProgress } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'

const OrganizerLayout = ({ children }: { children: ReactNode }) => {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const user = useSelector((state: RootState) => state.app.user)
  const userReady = useSelector((state: RootState) => state.app.userReady)
  const { tournament } = useTournament(params.id)

  const isAdmin = user?.role === 'admin'

  const isTournamentManager = useMemo(() => {
    if (!user?.player?.id || !tournament?.managers) return false
    return tournament.managers.some((manager) => manager.id === user.player.id)
  }, [user?.player?.id, tournament?.managers])

  const canAccess = isAdmin || isTournamentManager

  useEffect(() => {
    if (!userReady) return

    if (!user) {
      router.replace(`/tournaments/${params.id}`)
      return
    }

    if (isAdmin) return
    if (!tournament) return

    if (!isTournamentManager) {
      router.replace(`/tournaments/${params.id}`)
    }
  }, [userReady, user, isAdmin, tournament, isTournamentManager, router, params.id])

  if (!userReady) {
    // Allow children to mount so Header can resolve auth and set userReady.
    return <>{children}</>
  }

  if (!user) return null

  if (!isAdmin && !tournament) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!canAccess) return null

  return <>{children}</>
}

export default OrganizerLayout
