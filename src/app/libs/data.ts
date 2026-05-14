import useSWR, { MutatorOptions } from 'swr'
import { SERVICE_ENDPOINT } from '../constants'
import axios from 'axios'
import { Booking, BookingAvailability, Court, Event, Match, Player, Tournament, Venue } from '@/type'

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

export interface MatchesResponse {
  matches: Match[]
  isLoading: boolean
  isError: boolean
  mutate: (data?: Match | Promise<Match>) => Promise<Match | undefined>
}

export const useMatchesEvent = (eventID: (string | undefined)): MatchesResponse => {

  const { data, error, mutate } = useSWR(
    `${SERVICE_ENDPOINT}/matches?eventID=${eventID}`,
    fetcher
  )

  return {
    matches: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

export const useMatchesTournament = (tournamentID: (string | undefined)): MatchesResponse => {
  const { data, error, mutate } = useSWR(
    `${SERVICE_ENDPOINT}/matches?tournamentID=${tournamentID}`,
    fetcher
  )

  return {
    matches: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

export interface MatchResponse {
  match: Match
  isLoading: boolean
  isError: boolean
  mutate: (data?: Match | Promise<Match>, options?: boolean | MutatorOptions | undefined) => Promise<Match | undefined>
}

export const useMatch = (id: (string | undefined)): MatchResponse => {

  const { data, error, mutate } = useSWR(
    `${SERVICE_ENDPOINT}/matches/${id}`,
    fetcher
  )

  return {
    match: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

export interface MyMatchesResponse {
  myMatches: Match[]
  isLoading: boolean
  isError: boolean
  mutate: (data?: Event | Promise<Event>) => Promise<Event | undefined>
}

export const useMyMatches = (tournamentID: string|undefined): MyMatchesResponse => {
  const { data, error, mutate } = useSWR(
    tournamentID ? `${SERVICE_ENDPOINT}/matches/my-matches?tournamentID=${tournamentID}` : null,
    (url) => fetcher(url, true)
  )

  return {
    myMatches: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

// ── Venues ─────────────────────────────────────────────────────────────────

export interface VenuesResponse {
  venues: Venue[]
  isLoading: boolean
  isError: boolean
  mutate: () => Promise<Venue[] | undefined>
}

export const useVenues = (): VenuesResponse => {
  const { data, error, mutate } = useSWR(
    `${SERVICE_ENDPOINT}/venues`,
    fetcher
  )
  return { venues: data ?? [], isLoading: !error && !data, isError: error, mutate }
}

export interface VenueResponse {
  venue: Venue | undefined
  isLoading: boolean
  isError: boolean
  mutate: (data?: Venue | Promise<Venue>, options?: boolean | MutatorOptions) => Promise<Venue | undefined>
}

export const useVenue = (id: string | undefined): VenueResponse => {
  const { data, error, mutate } = useSWR(
    id ? `${SERVICE_ENDPOINT}/venues/${id}` : null,
    fetcher
  )
  return { venue: data, isLoading: !error && !data, isError: error, mutate }
}

// ── Courts ──────────────────────────────────────────────────────────────────

export interface CourtsResponse {
  courts: Court[]
  isLoading: boolean
  isError: boolean
  mutate: () => Promise<Court[] | undefined>
}

export const useCourts = (): CourtsResponse => {
  const { data, error, mutate } = useSWR(
    `${SERVICE_ENDPOINT}/courts`,
    fetcher
  )
  return { courts: data ?? [], isLoading: !error && !data, isError: error, mutate }
}

export interface CourtResponse {
  court: Court | undefined
  isLoading: boolean
  isError: boolean
  mutate: (data?: Court | Promise<Court>, options?: boolean | MutatorOptions) => Promise<Court | undefined>
}

export const useCourt = (id: string | undefined): CourtResponse => {
  const { data, error, mutate } = useSWR(
    id ? `${SERVICE_ENDPOINT}/courts/${id}` : null,
    fetcher
  )
  return { court: data, isLoading: !error && !data, isError: error, mutate }
}

export interface CourtAvailabilityResponse {
  availability: BookingAvailability | undefined
  isLoading: boolean
  isError: boolean
  mutate: () => Promise<BookingAvailability | undefined>
}

export const useCourtAvailability = (
  courtId: string | undefined,
  date: string | undefined,
  durationMinutes: number | undefined,
): CourtAvailabilityResponse => {
  const key = courtId && date && durationMinutes
    ? `${SERVICE_ENDPOINT}/courts/${courtId}/availability?date=${date}&durationMinutes=${durationMinutes}`
    : null
  const { data, error, mutate } = useSWR(key, fetcher)
  return { availability: data, isLoading: !error && !data, isError: error, mutate }
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export interface BookingsResponse {
  bookings: Booking[]
  isLoading: boolean
  isError: boolean
  mutate: () => Promise<Booking[] | undefined>
}

export const useMyBookings = (): BookingsResponse => {
  const { data, error, mutate } = useSWR(
    `${SERVICE_ENDPOINT}/bookings`,
    (url) => fetcher(url, true)
  )
  return { bookings: data ?? [], isLoading: !error && !data, isError: error, mutate }
}

export interface VenueBookingsParams {
  paymentStatus?: string
  date?: string
  venueID?: string
}

export const useVenueBookings = (params: VenueBookingsParams): BookingsResponse => {
  const searchParams = new URLSearchParams()
  if (params.venueID) searchParams.set('venueID', params.venueID)
  if (params.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus)
  if (params.date) searchParams.set('date', params.date)
  const key = params.venueID
    ? `${SERVICE_ENDPOINT}/bookings/venue-admin?${searchParams.toString()}`
    : null
  const { data, error, mutate } = useSWR(
    key,
    (url) => fetcher(url, true)
  )
  return { bookings: data ?? [], isLoading: !error && !data, isError: error, mutate }
}

