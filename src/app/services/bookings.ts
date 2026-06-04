import { Booking, BookingType, NewBooking } from '@/type'
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
  bookingType: BookingType.SingleShot;
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
  bookedAsAdmin?: boolean;
  couponCode?: string;
  overridePrice?: number;
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
  bookingType: BookingType.Recurring;
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

const payBooking = (bookingBundleID: string, payload: PayBookingPayload, guestEmail?: string): Promise<PayBookingResponse> => {
  const params = guestEmail ? { guestEmail } : undefined
  const request = axios.put(`${baseUrl}/bundles/${bookingBundleID}/pay`, payload, {
    withCredentials: !guestEmail,
    params,
  })
  return request.then((response) => response.data as PayBookingResponse)
}

export interface BundleResponse {
  bookings: import('@/type').Booking[];
  venue: import('@/type').Venue | null;
  court: import('@/type').Court | null;
}

const getBundle = (bookingBundleID: string, guestEmail?: string): Promise<BundleResponse> => {
  const params = guestEmail ? { guestEmail } : undefined
  return axios.get(`${baseUrl}/bundles/${bookingBundleID}`, {
    withCredentials: !guestEmail,
    params,
  }).then((response) => response.data as BundleResponse)
}

interface VenueBookingsParams {
  paymentStatus?: string;
  date?: string;
  venueID?: string;
}

interface RescheduleBookingPayload {
  courtID: string;
  date: string;
  startTime: string;
  endTime: string;
  applyToBundle?: boolean;
}

const getVenueBookings = (params?: VenueBookingsParams): Promise<Booking[]> => {
  return axios.get(`${baseUrl}/venue-admin`, {
    withCredentials: true,
    params,
  }).then((response) => response.data as Booking[])
}

const approvePayment = (bookingBundleID: string): Promise<{ message: string; bookings: Booking[] }> => {
  return axios.put(`${baseUrl}/bundles/${bookingBundleID}/approve-payment`, {}, {
    withCredentials: true,
  }).then((response) => response.data as { message: string; bookings: Booking[] })
}

const markAsPaid = (bookingID: string): Promise<{ message: string; booking: Booking }> => {
  return axios.put(`${baseUrl}/${bookingID}/mark-paid`, {}, {
    withCredentials: true,
  }).then((response) => response.data as { message: string; booking: Booking })
}

const reschedule = (bookingID: string, payload: RescheduleBookingPayload): Promise<Booking> => {
  return axios.put(`${baseUrl}/${bookingID}/reschedule`, payload, {
    withCredentials: true,
  }).then((response) => response.data as Booking)
}

export default {
  getAll,
  getById,
  getBundle,
  createSingle,
  createBundle,
  createRecurring,
  cancel,
  payBooking,
  getVenueBookings,
  approvePayment,
  markAsPaid,
  reschedule,
}
