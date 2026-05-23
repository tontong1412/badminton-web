import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'

const resaleService = {
  create: (bookingID: string, askingPrice: number) =>
    axios.post(
      `${SERVICE_ENDPOINT}/resale`,
      { bookingID, askingPrice },
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
}

export default resaleService
