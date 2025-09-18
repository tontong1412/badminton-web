import useSWR from 'swr'
import { SERVICE_ENDPOINT } from '../constants'
import axios from 'axios'
import { Event, Player, Tournament } from '@/type'

const fetcher = (url: string, withCredentials: boolean) => axios.get(
  url,
  { withCredentials }
).then((res) => {
  return res.data
}).catch((err) => {
  console.log(err)
})

export interface TournamentResponse {
  tournament: Tournament
  isLoading: boolean
  isError: boolean
  mutate: (data?: Tournament | Promise<Tournament>) => Promise<Tournament | undefined>
}

export const useTournament = (id: string|undefined): TournamentResponse => {
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

export interface MyEventsResponse {
  myEvents: Event[]
  isLoading: boolean
  isError: boolean
  mutate: (data?: Event | Promise<Event>) => Promise<Event | undefined>
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

export interface EventResponse {
  event: Event
  isLoading: boolean
  isError: boolean
  mutate: (data?: Event | Promise<Event>) => Promise<Event | undefined>
}

export const useEvent = (id: string|undefined): EventResponse => {
  const { data, error, mutate } = useSWR(
    id ? `${SERVICE_ENDPOINT}/events/${id}` : null,
    fetcher
  )

  return {
    event: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

export interface PlayersResponse {
  players: Player[]
  isLoading: boolean
  isError: boolean
  mutate: (data?: Player | Promise<Player>) => Promise<Player | undefined>
}

export const usePlayers = (): PlayersResponse => {
  const { data, error, mutate } = useSWR(
    `${SERVICE_ENDPOINT}/players`,
    fetcher
  )

  return {
    players: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

