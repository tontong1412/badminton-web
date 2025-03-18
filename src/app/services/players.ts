import { Player } from '@/type'
import axios from 'axios'
const baseUrl = 'http://localhost:8080/api/players'

const getAll = () : Promise<Player[]> => {
  const request = axios.get(baseUrl)
  return request.then((response) => response.data as Player[])
}

export default {
  getAll
}