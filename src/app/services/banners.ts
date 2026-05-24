import { Banner } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/banners`

const getActive = (): Promise<Banner[]> => {
  return axios.get(baseUrl).then((r) => r.data as Banner[])
}

const getAll = (): Promise<Banner[]> => {
  return axios.get(`${baseUrl}/all`, { withCredentials: true }).then((r) => r.data as Banner[])
}

const create = (payload: { title?: string; image: string; linkUrl?: string; order?: number; isActive?: boolean }): Promise<Banner> => {
  return axios.post(baseUrl, payload, { withCredentials: true }).then((r) => r.data as Banner)
}

const update = (id: string, payload: { title?: string; linkUrl?: string; order?: number; isActive?: boolean }): Promise<Banner> => {
  return axios.put(`${baseUrl}/${id}`, payload, { withCredentials: true }).then((r) => r.data as Banner)
}

const remove = (id: string): Promise<void> => {
  return axios.delete(`${baseUrl}/${id}`, { withCredentials: true }).then(() => undefined)
}

export default { getActive, getAll, create, update, remove }
