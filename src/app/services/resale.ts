import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const resaleService = {
  create: (bookingID: string, askingPrice: number, subStartTime?: string, subEndTime?: string) =>
    axios.post(
      `${SERVICE_ENDPOINT}/resale`,
      { bookingID, askingPrice, subStartTime, subEndTime },
      { withCredentials: true },
    ).then((r) => r.data),

  getByVenue: (venueID: string, date?: string) => {
    const params = new URLSearchParams({ venueID })
    if (date) {
      params.set('dateFrom', date)
      params.set('dateTo', date)
    }
    return axios.get(`${SERVICE_ENDPOINT}/resale?${params.toString()}`).then((r) => r.data)
  },

  cancel: (listingID: string) =>
    axios.put(
      `${SERVICE_ENDPOINT}/resale/${listingID}/cancel`,
      {},
      { withCredentials: true },
    ).then((r) => r.data),

  buy: (listingID: string) =>
    axios.put(
      `${SERVICE_ENDPOINT}/resale/${listingID}/buy`,
      {},
      { withCredentials: true },
    ).then((r) => r.data),

  getAdminPayouts: () =>
    axios.get(`${SERVICE_ENDPOINT}/resale/admin/payouts`, { withCredentials: true }).then((r) => r.data),

  markSellerPaid: (listingID: string) =>
    axios.put(`${SERVICE_ENDPOINT}/resale/${listingID}/mark-seller-paid`, {}, { withCredentials: true }).then((r) => r.data),

  payoutWithSlip: (listingIDs: string[], slipBase64: string, slipMimeType: string, slipFileName: string) =>
    axios.post(
      `${SERVICE_ENDPOINT}/resale/admin/payout-with-slip`,
      { listingIDs, slipBase64, slipMimeType, slipFileName },
      { withCredentials: true },
    ).then((r) => r.data),
}

export default resaleService
