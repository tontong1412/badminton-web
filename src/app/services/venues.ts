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

export default {
  getAll,
  getById,
  getCourts,
}
