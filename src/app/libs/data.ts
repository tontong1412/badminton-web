import useSWR from 'swr'
import { SERVICE_ENDPOINT } from '../constants'
import axios from 'axios'
import { Event, Tournament } from '@/type'

const fetcher = (url: string, withCredentials: boolean) => axios.get(
  url,
  { withCredentials }
).then((res) => {
  return res.data
}).catch((err) => {
  console.log(err)
})

interface TournmentResponse {
  tournament: Tournament
  isLoading: boolean
  isError: boolean
  mutate: ()=>void
}

export const useTournament = (id: string|undefined): TournmentResponse => {
  const { data, error, mutate } = useSWR(
    id ? `${SERVICE_ENDPOINT}/tournaments/${id}` : null,
    fetcher
  )

  return {
    tournament: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

interface MyEventsResponse {
  myEvents: Event[]
  isLoading: boolean
  isError: boolean
  mutate: ()=>void
}

export const useMyEvents = (tournamentID: string|undefined): MyEventsResponse => {
  const { data, error, mutate } = useSWR(
    tournamentID ? `${SERVICE_ENDPOINT}/events/my-events?tournamentID=${tournamentID}` : null,
    (url) => fetcher(url, true)
  )

  return {
    myEvents: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

