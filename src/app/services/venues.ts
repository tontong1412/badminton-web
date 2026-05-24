import { Court, Venue } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/venues`
const courtsUrl = `${SERVICE_ENDPOINT}/courts`

const getAll = (): Promise<Venue[]> => {
  const request = axios.get(baseUrl)
  return request.then((response) => response.data as Venue[])
}

const getById = (id: string): Promise<Venue> => {
  const request = axios.get(`${baseUrl}/${id}`)
  return request.then((response) => response.data as Venue)
}

const getCourts = (): Promise<Court[]> => {
  return axios.get(courtsUrl).then((response) => response.data as Court[])
}

const update = (id: string, payload: Partial<Venue>): Promise<Venue> => {
  return axios.put(`${baseUrl}/${id}`, payload, { withCredentials: true }).then((r) => r.data as Venue)
}

const setSchedule = (
  id: string,
  payload: {
    weeklySchedule?: Record<string, { open: string; close: string } | null>;
    gapPolicy?: { enabled: boolean; minimumGapMinutes: 30 | 60 };
  },
): Promise<Venue> => {
  return axios.put(`${baseUrl}/${id}/schedule`, payload, { withCredentials: true }).then((r) => r.data as Venue)
}

const addHoliday = (
  id: string,
  holiday: { date: string; isClosed: boolean; openTime?: string; closeTime?: string },
): Promise<Venue> => {
  return axios.post(`${baseUrl}/${id}/holidays`, holiday, { withCredentials: true }).then((r) => r.data as Venue)
}

const removeHoliday = (id: string, date: string): Promise<Venue> => {
  return axios.delete(`${baseUrl}/${id}/holidays/${date}`, { withCredentials: true }).then((r) => r.data as Venue)
}

const uploadImage = (id: string, type: 'coverImage' | 'logo', image: string): Promise<Venue> => {
  return axios.post(`${baseUrl}/${id}/upload`, { type, image }, { withCredentials: true }).then((r) => r.data as Venue)
}

const setFacilities = (id: string, facilities: string[]): Promise<Venue> => {
  return axios.put(`${baseUrl}/${id}/facilities`, { facilities }, { withCredentials: true }).then((r) => r.data as Venue)
}

const addManager = (id: string, userID: string): Promise<Venue> => {
  return axios.post(`${baseUrl}/${id}/managers`, { userID }, { withCredentials: true }).then((r) => r.data as Venue)
}

const removeManager = (id: string, userID: string): Promise<Venue> => {
  return axios.delete(`${baseUrl}/${id}/managers/${userID}`, { withCredentials: true }).then((r) => r.data as Venue)
}

export interface CreateVenuePayload {
  name: { th: string; en: string };
  address: string;
  ownerUserID: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  weeklySchedule?: Record<string, { open: string; close: string } | null>;
  gapPolicy?: { enabled: boolean; minimumGapMinutes: 30 | 60 };
  slotDurationMinutes?: 30 | 60;
}

const create = (payload: CreateVenuePayload): Promise<Venue> => {
  return axios.post(baseUrl, payload, { withCredentials: true }).then((r) => r.data as Venue)
}

export default {
  getAll,
  getById,
  getCourts,
  update,
  setSchedule,
  setFacilities,
  addHoliday,
  removeHoliday,
  uploadImage,
  addManager,
  removeManager,
  create,
}
