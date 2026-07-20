'use client'

import { useVenue } from '@/app/libs/data'
import { RootState } from '@/app/libs/redux/store'
import { useParams, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'

const VenueAdminLayout = ({ children }: { children: ReactNode }) => {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const venueID = params.id

  const user = useSelector((state: RootState) => state.app.user) as ({ id?: string; role?: string } | null)
  const userReady = useSelector((state: RootState) => state.app.userReady)
  const { venue } = useVenue(venueID)

  const isSystemAdmin = user?.role === 'admin'
  const userID = user?.id

  const hasVenueAccess = useMemo(() => {
    if (!userID || !venue) return false
    const isOwner = venue.ownerUserID === userID
    const isManager = venue.managerUserIDs.includes(userID)
    return isOwner || isManager
  }, [userID, venue])

  useEffect(() => {
    if (!userReady) return

    if (!userID) {
      router.replace(`/venues/${venueID}`)
      return
    }

    if (isSystemAdmin) return
    if (!venue) return

    if (!hasVenueAccess) {
      router.replace(`/venues/${venueID}`)
    }
  }, [userReady, userID, isSystemAdmin, venue, hasVenueAccess, router, venueID])

  if (!userReady) {
    // Let child pages mount so Header can bootstrap auth and set userReady.
    return <>{children}</>
  }

  if (!userID) return null
  if (isSystemAdmin) return <>{children}</>
  if (!venue) return <>{children}</>
  if (!hasVenueAccess) return null

  return <>{children}</>
}

export default VenueAdminLayout
