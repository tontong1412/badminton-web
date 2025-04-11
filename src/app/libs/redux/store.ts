import { configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import appReducer from './slices/appSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
})

// Types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch
