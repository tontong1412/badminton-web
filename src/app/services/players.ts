import { Player, PlayerWithAccount } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'
const baseUrl = `${SERVICE_ENDPOINT}/players`

const getAll = () : Promise<Player[]> => {
  const request = axios.get(baseUrl)
  return request.then((response) => response.data as Player[])
}

const getWithAccount = (): Promise<PlayerWithAccount[]> => {
  return axios.get(`${baseUrl}/with-account`, { withCredentials: true }).then((r) => r.data as PlayerWithAccount[])
}

const getMe = (): Promise<Player> =>
  axios.get(`${baseUrl}/me`, { withCredentials: true }).then((r) => r.data as Player)

const updateMe = (id: string, data: Partial<Player>): Promise<Player> =>
  axios.put(`${baseUrl}/${id}`, data, { withCredentials: true }).then((r) => r.data as Player)

export default {
  getAll,
  getWithAccount,
  getMe,
  updateMe,
}