import { BookingStatus, PaymentStatus } from '@/type'
import { deriveGroupedPaymentStatus, getBookingDateBundleGroupKey } from '@/app/bookings/grouping'

describe('deriveGroupedPaymentStatus', () => {
  it('returns unpaid for fully cancelled group when underlying items are unpaid', () => {
    const status = deriveGroupedPaymentStatus([
      { status: BookingStatus.Cancelled, paymentStatus: PaymentStatus.Unpaid },
      { status: BookingStatus.Cancelled, paymentStatus: PaymentStatus.Unpaid },
    ])

    expect(status).toBe(PaymentStatus.Unpaid)
  })

  it('uses non-cancelled items when present', () => {
    const status = deriveGroupedPaymentStatus([
      { status: BookingStatus.Cancelled, paymentStatus: PaymentStatus.Paid },
      { status: BookingStatus.Pending, paymentStatus: PaymentStatus.Unpaid },
    ])

    expect(status).toBe(PaymentStatus.Unpaid)
  })

  it('returns paid when all relevant items are paid', () => {
    const status = deriveGroupedPaymentStatus([
      { status: BookingStatus.Cancelled, paymentStatus: PaymentStatus.Unpaid },
      { status: BookingStatus.Confirmed, paymentStatus: PaymentStatus.Paid },
      { status: BookingStatus.Confirmed, paymentStatus: PaymentStatus.Paid },
    ])

    expect(status).toBe(PaymentStatus.Paid)
  })
})

describe('getBookingDateBundleGroupKey', () => {
  it('returns different keys for same bundle on different dates', () => {
    const dayOne = getBookingDateBundleGroupKey({
      id: 'booking-1',
      date: '2026-07-20',
      bookingBundleID: 'bundle-1',
    })
    const dayTwo = getBookingDateBundleGroupKey({
      id: 'booking-2',
      date: '2026-07-21',
      bookingBundleID: 'bundle-1',
    })

    expect(dayOne).not.toBe(dayTwo)
  })

  it('returns same key for same date and same bundle', () => {
    const first = getBookingDateBundleGroupKey({
      id: 'booking-1',
      date: '2026-07-20',
      bookingBundleID: 'bundle-1',
    })
    const second = getBookingDateBundleGroupKey({
      id: 'booking-2',
      date: '2026-07-20',
      bookingBundleID: 'bundle-1',
    })

    expect(first).toBe(second)
  })

  it('falls back to single booking key when bundle is missing', () => {
    const first = getBookingDateBundleGroupKey({
      id: 'booking-1',
      date: '2026-07-20',
    })
    const second = getBookingDateBundleGroupKey({
      id: 'booking-2',
      date: '2026-07-20',
    })

    expect(first).not.toBe(second)
  })
})
