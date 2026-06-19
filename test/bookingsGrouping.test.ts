import { BookingStatus, PaymentStatus } from '@/type'
import { deriveGroupedPaymentStatus } from '@/app/bookings/grouping'

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
