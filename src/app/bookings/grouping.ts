import { BookingResaleOutcome, BookingStatus, PaymentStatus } from '@/type'

interface BookingStatusSnapshot {
  status: BookingStatus | string;
  resaleOutcome?: BookingResaleOutcome | string;
}

export const getBookingDisplayStatus = (booking: BookingStatusSnapshot): string =>
  booking.status === BookingStatus.Cancelled && booking.resaleOutcome === BookingResaleOutcome.Resold
    ? 'sold'
    : booking.status

export const getGroupedDisplayStatus = (status: string, bookings: BookingStatusSnapshot[]): string =>
  status === BookingStatus.Cancelled && bookings.length > 0 && bookings.every((booking) => getBookingDisplayStatus(booking) === 'sold')
    ? 'sold'
    : status

interface BookingPaymentSnapshot {
  status: BookingStatus | string;
  paymentStatus: PaymentStatus | string;
}

interface BookingGroupSnapshot {
  id: string;
  date: string;
  bookingBundleID?: string;
}

export const getBookingDateBundleGroupKey = (booking: BookingGroupSnapshot): string => {
  const bundlePart = booking.bookingBundleID || `single-${booking.id}`
  return `${booking.date}::${bundlePart}`
}

export const deriveGroupedPaymentStatus = (items: BookingPaymentSnapshot[]): PaymentStatus => {
  const nonCancelledItems = items.filter((item) => item.status !== BookingStatus.Cancelled)
  const paymentSourceItems = nonCancelledItems.length > 0 ? nonCancelledItems : items

  if (paymentSourceItems.length === 0) {
    return PaymentStatus.Pending
  }

  const allPaid = paymentSourceItems.every((item) => item.paymentStatus === PaymentStatus.Paid)
  if (allPaid) {
    return PaymentStatus.Paid
  }

  const anyUnpaid = paymentSourceItems.some((item) => item.paymentStatus === PaymentStatus.Unpaid)
  return anyUnpaid ? PaymentStatus.Unpaid : PaymentStatus.Pending
}
