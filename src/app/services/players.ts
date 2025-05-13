import { Player } from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'
const baseUrl = `${SERVICE_ENDPOINT}/api/players`

const getAll = () : Promise<Player[]> => {
  const request = axios.get(baseUrl)
  return request.then((response) => response.data as Player[])
}

export default {
  getAll
}