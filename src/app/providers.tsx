'use client'

import { Provider } from 'react-redux'
import { store } from './libs/redux/store'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { initializeLanguage, logout } from './libs/redux/slices/appSlice'
import axios from 'axios'
import { GoogleOAuthProvider } from '@react-oauth/google'

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
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          const state = store.getState()
          if (state.app.user) {
            store.dispatch(logout())
          }
        }
        return Promise.reject(error)
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
