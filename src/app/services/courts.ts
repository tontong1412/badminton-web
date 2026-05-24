import { Court, BookingAvailability, CourtPricingRule } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/courts`

export interface CreateCourtPayload {
  venueID: string
  name: string
  description?: string
  pricePerHour: number
  currency: string
  status?: 'active' | 'inactive'
  courtType?: string
}

export interface UpdateCourtPayload {
  name?: string
  description?: string
  pricePerHour?: number
  currency?: string
  status?: 'active' | 'inactive'
  pricingRules?: CourtPricingRule[]
  courtType?: string
}

const getAll = (): Promise<Court[]> => {
  const request = axios.get(baseUrl)
  return request.then((response) => response.data as Court[])
}

const getById = (id: string): Promise<Court> => {
  const request = axios.get(`${baseUrl}/${id}`)
  return request.then((response) => response.data as Court)
}

const getAvailability = (id: string, date: string, durationMinutes: number): Promise<BookingAvailability> => {
  const request = axios.get(`${baseUrl}/${id}/availability`, {
    params: {
      date,
      durationMinutes,
    }
  })
  return request.then((response) => response.data as BookingAvailability)
}

const getBulkAvailability = (courtIds: string[], date: string, durationMinutes: number, venueId: string): Promise<Record<string, BookingAvailability>> => {
  const request = axios.get(`${baseUrl}/availability/bulk`, {
    params: {
      courtIds: courtIds.join(','),
      date,
      durationMinutes,
      venueId,
    }
  })
  return request.then((response) => response.data as Record<string, BookingAvailability>)
}

const create = (payload: CreateCourtPayload): Promise<Court> =>
  axios.post(baseUrl, payload, { withCredentials: true }).then((r) => r.data as Court)

const update = (id: string, payload: UpdateCourtPayload): Promise<Court> =>
  axios.put(`${baseUrl}/${id}`, payload, { withCredentials: true }).then((r) => r.data as Court)

export default {
  getAll,
  getById,
  getAvailability,
  getBulkAvailability,
  create,
  update,
}
