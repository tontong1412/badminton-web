import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import appReducer from './slices/appSlice'
import bookingReducer from './slices/bookingSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    booking: bookingReducer,
  },
})

// Types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
