'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { trackPageView } from '@/app/libs/firebase/client'

const RouteAnalyticsTracker = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastTrackedPath = useRef<string>('')

  useEffect(() => {
    if (!pathname) {
      return
    }

    const searchValue = searchParams.toString()
    const currentPath = searchValue ? `${pathname}?${searchValue}` : pathname

    // React strict mode can invoke effects twice in development.
    if (lastTrackedPath.current === currentPath) {
      return
    }

    lastTrackedPath.current = currentPath

    void trackPageView({
      pagePath: currentPath,
      pageLocation: window.location.href,
      pageTitle: document.title,
    })
  }, [pathname, searchParams])

  return null
}

export default RouteAnalyticsTracker
