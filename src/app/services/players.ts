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

export default {
  getAll,
  getWithAccount,
}