'use client'

import { Provider } from 'react-redux'
import { store } from './libs/redux/store'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { initializeLanguage } from './libs/redux/slices/appSlice'

import { TypedUseSelectorHook, useSelector as useReduxSelector } from 'react-redux'
import { RootState, AppDispatch } from './libs/redux/store'
export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector
export const useAppDispatch = () => useDispatch<AppDispatch>()

const  LanguageInitializer = () => {
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(initializeLanguage())
  }, [dispatch])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <LanguageInitializer />
      {children}
    </Provider>)
}
