import { Booking, BookingType, NewBooking, VenueAnalyticsResponse } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/bookings`

const getAll = (): Promise<Booking[]> => {
  const request = axios.get(baseUrl, {
    withCredentials: true,
  })
  return request.then((response) => response.data as Booking[])
}

export type MyBookingsTab = 'active' | 'past' | 'cancelled'

export interface MyBookingsPagedResponse {
  tab: MyBookingsTab;
  limit: number;
  bookings: Booking[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface MyBookingsPagedParams {
  tab: MyBookingsTab;
  limit?: number;
  cursor?: string;
}

const getPaged = (params: MyBookingsPagedParams): Promise<MyBookingsPagedResponse> => {
  return axios.get(`${baseUrl}/paged`, {
    withCredentials: true,
    params,
  }).then((response) => response.data as MyBookingsPagedResponse)
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
  addOnIDsBySlot?: Record<string, string[]>;
  addOnIDs?: string[];
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

export interface CreateRecurringBookingPayload {
  courtID?: string;
  courtIDs?: string[];
  addOnIDsByCourtAndSlot?: Record<string, Record<string, string[]>>;
  addOnIDsByCourt?: Record<string, string[]>;
  rangeStart: string;
  rangeEnd: string;
  startTime: string;
  endTime: string;
  pattern: 'daily' | 'weekly';
  daysOfWeek?: number[];
  slip?: string;
  note?: string;
  bookedAsAdmin?: boolean;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}

interface CreateRecurringBookingResponse {
  recurringGroups: {
    id: string;
    courtID: string;
  }[];
  recurringGroup?: {
    id: string;
    courtID: string;
  };
  bookings: Booking[];
}

const createRecurring = (payload: CreateRecurringBookingPayload): Promise<CreateRecurringBookingResponse> => {
  const request = axios.post(`${baseUrl}/recurring`, payload, {
    withCredentials: true,
  })
  return request.then((response) => response.data as CreateRecurringBookingResponse)
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
  courts?: import('@/type').Court[];
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
  search?: string;
}

interface VenueAnalyticsParams {
  venueID: string;
  dateFrom: string;
  dateTo: string;
}

interface RescheduleBookingPayload {
  courtID: string;
  date: string;
  startTime: string;
  endTime: string;
  applyToBundle?: boolean;
  swapWithBookingID?: string;
}

interface UpdateBookingAddOnsPayload {
  addOnIDs: string[];
}

const getVenueBookings = (params?: VenueBookingsParams): Promise<Booking[]> => {
  return axios.get(`${baseUrl}/venue-admin`, {
    withCredentials: true,
    params,
  }).then((response) => response.data as Booking[])
}

const getVenueAnalytics = (params: VenueAnalyticsParams): Promise<VenueAnalyticsResponse> => {
  return axios.get(`${baseUrl}/venue-admin/analytics`, {
    withCredentials: true,
    params,
  }).then((response) => response.data as VenueAnalyticsResponse)
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

const updateAddOns = (bookingID: string, payload: UpdateBookingAddOnsPayload): Promise<Booking> => {
  return axios.put(`${baseUrl}/${bookingID}/add-ons`, payload, {
    withCredentials: true,
  }).then((response) => response.data as Booking)
}

export default {
  getAll,
  getPaged,
  getById,
  getBundle,
  createSingle,
  createBundle,
  createRecurring,
  cancel,
  payBooking,
  getVenueBookings,
  getVenueAnalytics,
  approvePayment,
  markAsPaid,
  reschedule,
  updateAddOns,
}
