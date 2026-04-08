import { Booking, BookingAvailability } from '@/type'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  loading: boolean;
  error: string | null;
  availableSlots: BookingAvailability[];
}

const initialState: BookingState = {
  bookings: [],
  selectedBooking: null,
  loading: false,
  error: null,
  availableSlots: [],
}

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setBookings(state, action: PayloadAction<Booking[]>) {
      state.bookings = action.payload
      state.error = null
    },
    addBooking(state, action: PayloadAction<Booking>) {
      state.bookings.push(action.payload)
      state.error = null
    },
    updateBooking(state, action: PayloadAction<Booking>) {
      const index = state.bookings.findIndex((b) => b.id === action.payload.id)
      if (index !== -1) {
        state.bookings[index] = action.payload
      }
      state.error = null
    },
    removeBooking(state, action: PayloadAction<string>) {
      state.bookings = state.bookings.filter((b) => b.id !== action.payload)
      state.error = null
    },
    setSelectedBooking(state, action: PayloadAction<Booking | null>) {
      state.selectedBooking = action.payload
    },
    setAvailableSlots(state, action: PayloadAction<BookingAvailability[]>) {
      state.availableSlots = action.payload
      state.error = null
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    clearError(state) {
      state.error = null
    },
    resetBookingState(state) {
      state.bookings = []
      state.selectedBooking = null
      state.loading = false
      state.error = null
      state.availableSlots = []
    }
  }
})

export const {
  setBookings,
  addBooking,
  updateBooking,
  removeBooking,
  setSelectedBooking,
  setAvailableSlots,
  setLoading,
  setError,
  clearError,
  resetBookingState,
} = bookingSlice.actions

export default bookingSlice.reducer
