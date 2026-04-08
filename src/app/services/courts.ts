import { Court, BookingAvailability } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/courts`

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

export default {
  getAll,
  getById,
  getAvailability,
}
