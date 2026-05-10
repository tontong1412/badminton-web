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
  const request = axios.post(`${baseUrl}`, booking, {
    withCredentials: true,
  })
  return request.then((response) => response.data as Booking)
}

export interface BookingBundleItem {
  courtID: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface CreateBundlePayload {
  items: BookingBundleItem[];
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  note?: string;
  slip?: string;
}

export interface BookingBundleResponse {
  bookingBundleID: string;
  bookingCount: number;
  totalPrice: number;
  bookings: Booking[];
}

const createBundle = (payload: CreateBundlePayload): Promise<Booking | BookingBundleResponse> => {
  const request = axios.post(`${baseUrl}`, payload, {
    withCredentials: true,
  })
  return request.then((response) => response.data as Booking | BookingBundleResponse)
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

export interface PayBookingPayload {
  slip: string; // base64 data:image/*;base64,...
  note?: string;
}

export interface PayBookingResponse {
  message: string;
  bundleID: string;
  bookingCount: number;
  bookings: Booking[];
}

const payBooking = (bookingBundleID: string, payload: PayBookingPayload): Promise<PayBookingResponse> => {
  const request = axios.put(`${baseUrl}/bundles/${bookingBundleID}/pay`, payload, {
    withCredentials: true,
  })
  return request.then((response) => response.data as PayBookingResponse)
}

const getVenueBookings = (paymentStatus?: string): Promise<Booking[]> => {
  return axios.get(`${baseUrl}/venue-admin`, {
    withCredentials: true,
    params: paymentStatus ? { paymentStatus } : undefined,
  }).then((response) => response.data as Booking[])
}

const approvePayment = (bookingBundleID: string): Promise<{ message: string; bookings: Booking[] }> => {
  return axios.put(`${baseUrl}/bundles/${bookingBundleID}/approve-payment`, {}, {
    withCredentials: true,
  }).then((response) => response.data as { message: string; bookings: Booking[] })
}

export default {
  getAll,
  getById,
  createSingle,
  createBundle,
  createRecurring,
  cancel,
  payBooking,
  getVenueBookings,
  approvePayment,
}
