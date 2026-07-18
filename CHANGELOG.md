# Changelog (Compared to `main`)

Generated: 2026-06-20
Branch: `fix/cancel-booking`

## Commit delta
- Ahead of `main` by 2 commits
- `fd994af` - fix something
- `e3be0d1` - audit booker

## File changes
- Added: `src/app/bookings/grouping.ts`
- Modified: `src/app/bookings/page.tsx`
- Modified: `src/app/locales/en.json`
- Modified: `src/app/locales/th.json`
- Modified: `src/type.ts`
- Added: `test/bookingsGrouping.test.ts`

## Functional changes
- Added `deriveGroupedPaymentStatus()` helper for grouped booking payment state.
- Updated booking payment dialog flow:
  - immediate local state update from payment response
  - success screen after payment submit
  - status-specific messages for verified vs pending payments
- Added locale strings:
  - `booking.paymentSuccess`
  - `booking.done`
- Updated booking type with:
  - `bookerType: 'guest' | 'user' | 'admin'`
  - optional `createdByUserID`
- Added tests for grouped payment status behavior.

## Diff stats
- 6 files changed
- 310 insertions, 174 deletions
