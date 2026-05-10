'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminTimetableRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin') }, [router])
  return null
}
