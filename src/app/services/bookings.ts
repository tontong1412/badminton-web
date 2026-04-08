import { Booking, NewBooking } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/bookings`

const getAll = (): Promise<Booking[]> => {
  const request = axios.get(baseUrl, {
    withCredentials: true,
  })
  return request.then((response) => response.data as Booking[])
}

const getById = (id: string): Promise<Booking> => {
  const request = axios.get(`${baseUrl}/${id}`)
  return request.then((response) => response.data as Booking)
}

interface CreateSingleBookingPayload extends NewBooking {
  courtID: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  currency: string;
  bookerType: 'guest' | 'user';
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  bookingType: 'singleShot';
}

const createSingle = (booking: CreateSingleBookingPayload): Promise<Booking> => {
  const request = axios.post(`${baseUrl}`, booking)
  return request.then((response) => response.data as Booking)
}

interface CreateRecurringBookingPayload extends NewBooking {
  courtID: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  currency: string;
  dayOfWeek: number[];
  bookerType: 'guest' | 'user';
  bookingType: 'recurring';
}

const createRecurring = (booking: CreateRecurringBookingPayload): Promise<Booking> => {
  const request = axios.post(`${baseUrl}/recurring`, booking, {
    withCredentials: true,
  })
  return request.then((response) => response.data as Booking)
}

const cancel = (id: string): Promise<void> => {
  const request = axios.delete(`${baseUrl}/${id}`, {
    withCredentials: true,
  })
  return request.then(() => undefined)
}

const payBooking = (bookingBundleID: string): Promise<Booking> => {
  const request = axios.put(`${baseUrl}/bundles/${bookingBundleID}/pay`, {})
  return request.then((response) => response.data as Booking)
}

export default {
  getAll,
  getById,
  createSingle,
  createRecurring,
  cancel,
  payBooking,
}
