import { PaymentStatusDisplay, TeamStatusDisplay } from '@/type'

export const MAP_LEVEL_TO_LABEL = [
  'casual',
  'beginner',
  'intermediate',
  'advanced',
  'professional',
  'VIP',
]

export const SUPPORTED_LANG = [
  'en',
  'th'
]

export const LEVEL = [
  { th: 'มือใหม่', en: 'Beginner' },
  { th: 'N', en: 'N' },
  { th: 'N+', en: 'N+' },
  { th: 'S-', en: 'S-' },
  { th: 'S', en: 'S' },
  { th: 'S+', en: 'S+' },
  { th: 'P-', en: 'P-' },
  { th: 'P', en: 'P' },
  { th: 'P+', en: 'P+' },
  { th: 'C', en: 'C' },
  { th: 'B', en: 'B' },
  { th: 'A', en: 'A+' },
]
export const SERVICE_ENDPOINT = process.env.NEXT_PUBLIC_SERVICE_ENDPOINT
export const DEFAULT_LANGUAGE = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'th'

export const MAP_DECISION_STATUS: TeamStatusDisplay = {
  idle: {
    th: 'รอประเมิน',
    en: 'Waiting',
    color: 'warning'
  },
  approved: {
    th: 'ผ่าน',
    en: 'Approved',
    color: 'success'
  },
  reject: {
    th: 'ไม่ผ่าน',
    en: 'Rejected',
    color: 'error'
  },
  withdraw: {
    th: 'ถอนตัว',
    en: 'Withdraw',
    color: 'info'
  },
}

export const MAP_PAYMENT_STATUS: PaymentStatusDisplay = {
  pending: {
    th: 'รอตรวจสอบ',
    en: 'Pending',
    color: 'warning'
  },
  paid: {
    th: 'จ่ายแล้ว',
    en: 'Paid',
    color: 'success'
  },
  unpaid: {
    th: 'ยังไม่จ่าย',
    en: 'Unpaid',
    color: 'error'
  },
  refunded: {
    th: 'คืนเงินแล้ว',
    en: 'Refunded',
    color: 'info'
  },
}

