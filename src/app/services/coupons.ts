import axios from 'axios'
import { Coupon } from '@/type'
import { SERVICE_ENDPOINT } from '../constants'

const baseUrl = `${SERVICE_ENDPOINT}/coupons`

export interface ValidateCouponPayload {
  code: string;
  venueID: string;
  totalPrice: number;
}

export interface ValidateCouponResponse {
  valid: boolean;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  finalPrice: number;
}

const validate = (payload: ValidateCouponPayload): Promise<ValidateCouponResponse> =>
  axios.post(`${baseUrl}/validate`, payload).then((r) => r.data as ValidateCouponResponse)

export interface CreateCouponPayload {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}

const listByVenue = (venueID: string): Promise<Coupon[]> =>
  axios.get(`${baseUrl}/venue/${venueID}`, { withCredentials: true }).then((r) => r.data as Coupon[])

const create = (venueID: string, payload: CreateCouponPayload): Promise<Coupon> =>
  axios.post(`${baseUrl}/venue/${venueID}`, payload, { withCredentials: true }).then((r) => r.data as Coupon)

const remove = (venueID: string, couponID: string): Promise<void> =>
  axios.delete(`${baseUrl}/venue/${venueID}/${couponID}`, { withCredentials: true }).then(() => undefined)

export default { validate, listByVenue, create, remove }
