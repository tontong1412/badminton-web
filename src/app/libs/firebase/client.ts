'use client'

import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import { Analytics, getAnalytics, isSupported, logEvent } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const hasRequiredConfig = Object.values(firebaseConfig).every((value) => Boolean(value))

let analyticsInstancePromise: Promise<Analytics | null> | null = null

const getFirebaseApp = (): FirebaseApp => {
  if (getApps().length > 0) {
    return getApp()
  }

  return initializeApp(firebaseConfig)
}

export const getFirebaseAnalytics = async(): Promise<Analytics | null> => {
  if (typeof window === 'undefined' || !hasRequiredConfig) {
    return null
  }

  if (analyticsInstancePromise) {
    return analyticsInstancePromise
  }

  analyticsInstancePromise = isSupported()
    .then((supported) => {
      if (!supported) {
        return null
      }

      return getAnalytics(getFirebaseApp())
    })
    .catch(() => null)

  return analyticsInstancePromise
}

interface TrackPageViewParams {
  pagePath: string
  pageLocation: string
  pageTitle: string
}

export const trackPageView = async({
  pagePath,
  pageLocation,
  pageTitle,
}: TrackPageViewParams): Promise<void> => {
  const analytics = await getFirebaseAnalytics()
  if (!analytics) {
    return
  }

  logEvent(analytics, 'page_view', {
    page_path: pagePath,
    page_location: pageLocation,
    page_title: pageTitle,
  })
}
