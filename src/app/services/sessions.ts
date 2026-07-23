import {
  OpenPlaySession,
  SessionPricing,
  SessionAttendanceStatus,
  SessionRegistrationDetail,
  SessionRegistrationPlayerSnapshot,
  SessionRegistrationPaymentStatus,
  SessionMatchStatus,
  SessionOpenPlayMatch,
  SessionStatsResponse,
  SessionStatus,
  SessionType,
} from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/sessions`

type MaybePopulatedPlayer = {
  id?: string;
  officialName?: SessionRegistrationPlayerSnapshot['officialName'];
  displayName?: SessionRegistrationPlayerSnapshot['displayName'];
  contact?: SessionRegistrationPlayerSnapshot['contact'];
  level?: number;
  club?: string;
  photo?: string;
}

type SessionRegistrationApiShape = Omit<SessionRegistrationDetail, 'playerID' | 'player'> & {
  playerID: string | MaybePopulatedPlayer;
  player?: MaybePopulatedPlayer;
}

const normalizeRegistration = (data: SessionRegistrationApiShape): SessionRegistrationDetail => {
  const playerFromPlayerID = typeof data.playerID === 'object' && data.playerID !== null
    ? data.playerID
    : undefined
  const playerPayload = data.player ?? playerFromPlayerID
  const normalizedPlayerID = typeof data.playerID === 'string'
    ? data.playerID
    : (data.playerID.id ?? '')
  const player = playerPayload && playerPayload.id
    ? {
      id: playerPayload.id,
      officialName: playerPayload.officialName,
      displayName: playerPayload.displayName,
      contact: playerPayload.contact,
      level: playerPayload.level,
      club: playerPayload.club,
      photo: playerPayload.photo,
    }
    : undefined

  return {
    ...data,
    playerID: normalizedPlayerID,
    player,
  }
}

export interface SessionFilters {
  status?: SessionStatus;
  type?: SessionType;
  venueID?: string;
  organizerUserID?: string;
  registrationOpen?: boolean;
}

export interface UpsertSessionPayload {
  type?: SessionType.OpenPlay;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venueID: string;
  organizerUserIDs?: string[];
  maxParticipants: number;
  registrationOpen?: boolean;
  organizerContact: {
    name: string;
    phone: string;
    email?: string;
  };
  notes?: string;
  requiresApproval?: boolean;
  pricing: SessionPricing;
}

const getAll = (filters?: SessionFilters): Promise<OpenPlaySession[]> => {
  return axios.get(baseUrl, { params: filters }).then((response) => response.data as OpenPlaySession[])
}

const getMine = (): Promise<OpenPlaySession[]> => {
  return axios.get(`${baseUrl}/mine`, { withCredentials: true }).then((response) => response.data as OpenPlaySession[])
}

const getById = (id: string): Promise<OpenPlaySession> => {
  return axios.get(`${baseUrl}/${id}`).then((response) => response.data as OpenPlaySession)
}

const getMyRegistration = (id: string): Promise<SessionRegistrationDetail> => {
  return axios
    .get(`${baseUrl}/${id}/my-registration`, { withCredentials: true })
    .then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const getRegistrations = (id: string): Promise<SessionRegistrationDetail[]> => {
  return axios
    .get(`${baseUrl}/${id}/registrations`, { withCredentials: true })
    .then((response) => (response.data as SessionRegistrationApiShape[]).map(normalizeRegistration))
}

const create = (payload: UpsertSessionPayload): Promise<OpenPlaySession> => {
  return axios.post(baseUrl, payload, { withCredentials: true }).then((response) => response.data as OpenPlaySession)
}

const register = (id: string): Promise<SessionRegistrationDetail> => {
  return axios
    .post(`${baseUrl}/${id}/register`, {}, { withCredentials: true })
    .then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const cancelRegistration = (id: string): Promise<SessionRegistrationDetail> => {
  return axios
    .delete(`${baseUrl}/${id}/register`, { withCredentials: true })
    .then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const addRegistration = (id: string, payload: { playerID: string; note?: string }): Promise<SessionRegistrationDetail> => {
  return axios
    .post(`${baseUrl}/${id}/registrations`, payload, { withCredentials: true })
    .then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const approveRegistration = (id: string, registrationID: string): Promise<SessionRegistrationDetail> => {
  return axios
    .put(`${baseUrl}/${id}/registrations/${registrationID}/approve`, {}, { withCredentials: true })
    .then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const rejectRegistration = (id: string, registrationID: string): Promise<SessionRegistrationDetail> => {
  return axios
    .put(`${baseUrl}/${id}/registrations/${registrationID}/reject`, {}, { withCredentials: true })
    .then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const updatePaymentStatus = (
  id: string,
  registrationID: string,
  paymentStatus: SessionRegistrationPaymentStatus,
): Promise<SessionRegistrationDetail> => {
  return axios.put(
    `${baseUrl}/${id}/registrations/${registrationID}/payment`,
    { paymentStatus },
    { withCredentials: true },
  ).then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const updateAttendanceStatus = (
  id: string,
  registrationID: string,
  attendanceStatus: SessionAttendanceStatus,
): Promise<SessionRegistrationDetail> => {
  return axios.put(
    `${baseUrl}/${id}/registrations/${registrationID}/attendance`,
    { attendanceStatus },
    { withCredentials: true },
  ).then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const removeRegistration = (id: string, registrationID: string): Promise<SessionRegistrationDetail> => {
  return axios
    .delete(`${baseUrl}/${id}/registrations/${registrationID}`, { withCredentials: true })
    .then((response) => normalizeRegistration(response.data as SessionRegistrationApiShape))
}

const update = (id: string, payload: Partial<UpsertSessionPayload>): Promise<OpenPlaySession> => {
  return axios.put(`${baseUrl}/${id}`, payload, { withCredentials: true }).then((response) => response.data as OpenPlaySession)
}

const closeRegistration = (id: string): Promise<OpenPlaySession> => {
  return axios.put(`${baseUrl}/${id}/close-registration`, {}, { withCredentials: true }).then((response) => response.data as OpenPlaySession)
}

const start = (id: string): Promise<OpenPlaySession> => {
  return axios.put(`${baseUrl}/${id}/start`, {}, { withCredentials: true }).then((response) => response.data as OpenPlaySession)
}

const end = (id: string): Promise<OpenPlaySession> => {
  return axios.put(`${baseUrl}/${id}/end`, {}, { withCredentials: true }).then((response) => response.data as OpenPlaySession)
}

const cancel = (id: string): Promise<OpenPlaySession> => {
  return axios.put(`${baseUrl}/${id}/cancel`, {}, { withCredentials: true }).then((response) => response.data as OpenPlaySession)
}

// ── Match management ─────────────────────────────────────────────────────────

export interface MatchTeamPayload {
  playerIDs: string[];
}

export interface CreateMatchPayload {
  court: string;
  teams: [MatchTeamPayload, MatchTeamPayload];
}

export interface UpdateMatchPayload {
  court?: string;
  teams?: [MatchTeamPayload, MatchTeamPayload];
  status?: SessionMatchStatus;
  winnerTeamIndex?: 0 | 1 | null;
}

const getStats = (sessionID: string): Promise<SessionStatsResponse> => {
  return axios
    .get(`${baseUrl}/${sessionID}/stats`, { withCredentials: true })
    .then((response) => response.data as SessionStatsResponse)
}

const getMatches = (sessionID: string): Promise<SessionOpenPlayMatch[]> => {
  return axios
    .get(`${baseUrl}/${sessionID}/matches`, { withCredentials: true })
    .then((response) => response.data as SessionOpenPlayMatch[])
}

const createMatch = (sessionID: string, payload: CreateMatchPayload): Promise<SessionOpenPlayMatch> => {
  return axios
    .post(`${baseUrl}/${sessionID}/matches`, payload, { withCredentials: true })
    .then((response) => response.data as SessionOpenPlayMatch)
}

const autoGenerateMatches = (sessionID: string): Promise<SessionOpenPlayMatch[]> => {
  return axios
    .post(`${baseUrl}/${sessionID}/matches/auto`, {}, { withCredentials: true })
    .then((response) => response.data as SessionOpenPlayMatch[])
}

const updateMatch = (sessionID: string, matchID: string, payload: UpdateMatchPayload): Promise<SessionOpenPlayMatch> => {
  return axios
    .put(`${baseUrl}/${sessionID}/matches/${matchID}`, payload, { withCredentials: true })
    .then((response) => response.data as SessionOpenPlayMatch)
}

const deleteMatch = (sessionID: string, matchID: string): Promise<void> => {
  return axios
    .delete(`${baseUrl}/${sessionID}/matches/${matchID}`, { withCredentials: true })
    .then(() => undefined)
}

export default {
  getAll,
  getMine,
  getById,
  getMyRegistration,
  getRegistrations,
  create,
  register,
  cancelRegistration,
  addRegistration,
  approveRegistration,
  rejectRegistration,
  updatePaymentStatus,
  updateAttendanceStatus,
  removeRegistration,
  update,
  closeRegistration,
  start,
  end,
  cancel,
  getMatches,
  getStats,
  createMatch,
  autoGenerateMatches,
  updateMatch,
  deleteMatch,
}