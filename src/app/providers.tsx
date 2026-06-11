'use client'

import { Provider } from 'react-redux'
import { store } from './libs/redux/store'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { initializeLanguage, logout } from './libs/redux/slices/appSlice'
import axios from 'axios'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { SERVICE_ENDPOINT } from './constants'

import { TypedUseSelectorHook, useSelector as useReduxSelector } from 'react-redux'
import { RootState, AppDispatch } from './libs/redux/store'
export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector
export const useAppDispatch = () => useDispatch<AppDispatch>()

const LanguageInitializer = () => {
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(initializeLanguage())
  }, [dispatch])

  return null
}

const AxiosAuthInterceptor = () => {
  useEffect(() => {
    let isRefreshing = false
    let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = []

    const processQueue = (error: unknown) => {
      failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()))
      failedQueue = []
    }

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async(error) => {
        const originalRequest = error.config

        const isRefreshEndpoint = (originalRequest?.url as string | undefined)?.includes('/users/refresh-token')
        if (
          !axios.isAxiosError(error) ||
          error.response?.status !== 401 ||
          originalRequest?._retry ||
          isRefreshEndpoint
        ) {
          return Promise.reject(error)
        }

        if (isRefreshing) {
          return new Promise<void>((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then(() => axios(originalRequest))
            .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          await axios.post(`${SERVICE_ENDPOINT}/users/refresh-token`, {}, { withCredentials: true })
          processQueue(null)
          return axios(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError)
          const state = store.getState()
          if (state.app.user) {
            store.dispatch(logout())
          }
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }
    )
    return () => {
      axios.interceptors.response.eject(interceptorId)
    }
  }, [])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''}>
      <Provider store={store}>
        <LanguageInitializer />
        <AxiosAuthInterceptor />
        {children}
      </Provider>
    </GoogleOAuthProvider>)
}
