import { BookingStatus, PaymentStatus } from '@/type'

interface BookingPaymentSnapshot {
  status: BookingStatus | string;
  paymentStatus: PaymentStatus | string;
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
