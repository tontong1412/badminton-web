import {
  OpenPlaySession,
  SessionPricing,
  SessionAttendanceStatus,
  SessionRegistrationDetail,
  SessionRegistrationPaymentStatus,
  SessionStatus,
  SessionType,
} from '@/type'
import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/sessions`

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
  return axios.get(`${baseUrl}/${id}/my-registration`, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail)
}

const getRegistrations = (id: string): Promise<SessionRegistrationDetail[]> => {
  return axios.get(`${baseUrl}/${id}/registrations`, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail[])
}

const create = (payload: UpsertSessionPayload): Promise<OpenPlaySession> => {
  return axios.post(baseUrl, payload, { withCredentials: true }).then((response) => response.data as OpenPlaySession)
}

const register = (id: string): Promise<SessionRegistrationDetail> => {
  return axios.post(`${baseUrl}/${id}/register`, {}, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail)
}

const cancelRegistration = (id: string): Promise<SessionRegistrationDetail> => {
  return axios.delete(`${baseUrl}/${id}/register`, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail)
}

const addRegistration = (id: string, payload: { playerID: string; note?: string }): Promise<SessionRegistrationDetail> => {
  return axios.post(`${baseUrl}/${id}/registrations`, payload, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail)
}

const approveRegistration = (id: string, registrationID: string): Promise<SessionRegistrationDetail> => {
  return axios.put(`${baseUrl}/${id}/registrations/${registrationID}/approve`, {}, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail)
}

const rejectRegistration = (id: string, registrationID: string): Promise<SessionRegistrationDetail> => {
  return axios.put(`${baseUrl}/${id}/registrations/${registrationID}/reject`, {}, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail)
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
  ).then((response) => response.data as SessionRegistrationDetail)
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
  ).then((response) => response.data as SessionRegistrationDetail)
}

const removeRegistration = (id: string, registrationID: string): Promise<SessionRegistrationDetail> => {
  return axios.delete(`${baseUrl}/${id}/registrations/${registrationID}`, { withCredentials: true }).then((response) => response.data as SessionRegistrationDetail)
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
}