import { Tournament } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/tournaments`

const getById = (id: string): Promise<Tournament> => {
  return axios.get(`${baseUrl}/${id}`).then((r) => r.data as Tournament)
}

const update = (id: string, payload: Partial<Tournament>): Promise<Tournament> => {
  return axios.put(`${baseUrl}/${id}`, payload, { withCredentials: true }).then((r) => r.data as Tournament)
}

export default { getById, update }
