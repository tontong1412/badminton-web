# Court Booking Feature - Implementation Guide

This document outlines the court booking feature created for the badminton frontend application, which integrates with the existing badminton backend API.

## Overview

The court booking feature allows users to:
- Browse available venues and courts
- View real-time court availability
- Book courts for specific dates and times
- Manage their bookings (view, cancel, pay)
- Support for both guest and registered user bookings

## Architecture

### Database Models (Backend)
The feature uses existing backend models:
- **Venue**: Manages venue information, schedules, and holidays
- **Court**: Represents individual courts within venues
- **Booking**: Records all court bookings with pricing and payment details

### Frontend Structure

#### 1. **Types** (`src/type.ts`)
New types added:
- `Venue`: Venue information with schedule
- `Court`: Court details and pricing
- `Booking`: Booking record with all details
- `BookingStatus`: Enum for booking states (Confirmed, Pending, Cancelled)
- `BookingType`: Enum for booking types (SingleShot, Recurring)
- `BookingAvailability`: Available time slots for a court

#### 2. **Services** (`src/app/services/`)

**venues.ts**
```typescript
- getAll(): Promise<Venue[]>
- getById(id: string): Promise<Venue>
```

**courts.ts**
```typescript
- getAll(): Promise<Court[]>
- getById(id: string): Promise<Court>
- getAvailability(id: string, startDate: string, endDate: string): Promise<BookingAvailability[]>
```

**bookings.ts**
```typescript
- getAll(): Promise<Booking[]>
- getById(id: string): Promise<Booking>
- createSingle(booking: CreateSingleBookingPayload): Promise<Booking>
- createRecurring(booking: CreateRecurringBookingPayload): Promise<Booking>
- cancel(id: string): Promise<void>
- payBooking(bundleID: string): Promise<Booking>
```

#### 3. **Redux State Management** (`src/app/libs/redux/slices/bookingSlice.ts`)

State shape:
```typescript
{
  bookings: Booking[]
  selectedBooking: Booking | null
  loading: boolean
  error: string | null
  availableSlots: BookingAvailability[]
}
```

Actions:
- `setBookings`: Set all bookings
- `addBooking`: Add new booking
- `updateBooking`: Update existing booking
- `removeBooking`: Remove booking
- `setSelectedBooking`: Select a booking
- `setAvailableSlots`: Set available time slots
- `setLoading`: Set loading state
- `setError`: Set error message

#### 4. **Components**

**CourtSelection** (`src/app/components/CourtSelection.tsx`)
- Displays available courts for a venue
- Allows selecting a court
- Shows court details (name, price, status)
- Blue highlighting for selected court

**BookingAvailability** (`src/app/components/BookingAvailability.tsx`)
- Date picker for selecting booking date
- Displays available time slots
- Shows 90-day availability window
- Handles slot selection

**CourtBookingModal** (`src/app/components/CourtBookingModal.tsx`)
- 3-step booking modal:
  1. Select time slot
  2. Enter booker details (name, phone, email for guests)
  3. Review and confirm booking
- Calculates duration and price
- Handles both guest and registered user bookings
- Terms & conditions agreement checkbox

#### 5. **Pages**

**Venues Listing** (`src/app/court-booking/page.tsx`)
- Displays all available venues
- Shows venue info (name in EN/TH, address)
- Links to court selection page for each venue

**Court Selection** (`src/app/court-booking/[id]/page.tsx`)
- Shows all courts for a selected venue
- Court selection with details
- Booking modal integration
- Breadcrumb navigation

**My Bookings** (`src/app/bookings/page.tsx`)
- Table view of user's bookings
- Shows: court name, date, time, price, status, payment status
- Cancel booking functionality
- Payment status display
- Only allows cancellation for future bookings

#### 6. **Internationalization**
Added translations for both English and Thai:

**en.json** - All booking-related strings (50+ keys)
**th.json** - Thai translations

Key translation categories:
- UI labels
- Status messages
- Error messages
- Dialog titles and content
- Form labels

## API Integration

### Backend Endpoints Used

```
GET  /venues                           - List all venues
GET  /venues/:id                       - Get venue details
GET  /courts                           - List all courts
GET  /courts/:id                       - Get court details
GET  /courts/:id/availability          - Get availability
POST /bookings                         - Create single booking
POST /bookings/recurring               - Create recurring booking
GET  /bookings                         - Get user's bookings (requires auth)
GET  /bookings/:id                     - Get booking details
DELETE /bookings/:id                   - Cancel booking (requires auth)
PUT  /bookings/bundles/:id/pay         - Pay for booking
```

## Usage Flow

### 1. Browse Venues
- User navigates to `/court-booking`
- Sees list of all venues with details
- Clicks "View Courts" on a venue

### 2. Select Court
- Redirected to `/court-booking/[venueId]`
- Views all courts in the venue
- Selects a court (highlights on selection)
- Clicks "Proceed to Booking"

### 3. Book Court
- Modal opens with 3-step process
- **Step 1**: Selects date and available time slot
- **Step 2**: Enters booker information (if guest)
- **Step 3**: Reviews booking summary and accepts terms
- Confirms booking

### 4. Manage Bookings
- User visits `/bookings`
- Views all their bookings in a table
- Can cancel future bookings
- Can pay unpaid bookings

## Key Features

### Price Calculation
- Based on court's hourly rate and booking duration
- Duration calculated from start/end times
- Supports various slot durations (30-min slots support)

### Availability Management
- Shows available 30-minute slots
- Respects venue's gap policy (minimum gap between bookings)
- Displays 90-day availability window
- Considers venue holidays and daily schedules

### Booking Types
- **Single Shot**: One-time booking
- **Recurring**: Repeating bookings (on specific days of week)

### Booker Types
- **Guest**: Name, phone, email required
- **User**: Authenticated user (userID used)

### Booking Statuses
- **Confirmed**: Booking is confirmed
- **Pending**: Awaiting confirmation
- **Cancelled**: Booking was cancelled

### Payment Statuses
- **Paid**: Payment received
- **Unpaid**: Awaiting payment
- **Pending**: Payment processing
- **Refunded**: Refund issued

## Error Handling

- Network errors caught and displayed as alerts
- Form validation with specific error messages
- Loading states prevent duplicate submissions
- Redux error state for global error handling

## Security Considerations

- Bookings require authentication (using middleware in backend)
- Cancel and view operations check user ownership
- Payment operations protected by backend auth
- Guest bookings validated server-side

## Future Enhancements

1. **Recurring Bookings**: Improve UI for multi-date bookings
2. **Payment Integration**: Add payment gateway (Stripe, etc.)
3. **Calendar View**: Visual calendar for availability
4. **Booking History**: Archive and history tracking
5. **Notifications**: Email/SMS confirmations and reminders
6. **Reviews**: Court and venue reviews system
7. **Multiple Bookings**: Bundle multiple bookings together
8. **Resale**: Allow users to resell/transfer bookings
9. **Discount Codes**: Support promo/discount codes
10. **Analytics**: Dashboard for venue owners

## Testing

### Unit Tests to Add
- Service layer tests
- Redux reducer tests
- Component rendering tests

### E2E Tests to Add
- Complete booking flow
- Availability checking
- Error handling scenarios
- Integration with backend

## Deployment Notes

1. Ensure `.env.local` has correct `NEXT_PUBLIC_SERVICE_ENDPOINT`
2. Backend must be running and accessible
3. Database must be seeded with venues and courts
4. Verify CORS settings on backend match frontend URL

## File Structure

```
src/app/
├── court-booking/
│   ├── page.tsx                 # Venues listing
│   └── [id]/
│       └── page.tsx             # Courts for venue
├── bookings/
│   └── page.tsx                 # My bookings
├── components/
│   ├── CourtSelection.tsx        # Court picker
│   ├── BookingAvailability.tsx   # Slot picker
│   └── CourtBookingModal.tsx     # Booking form
├── services/
│   ├── venues.ts                # Venue API
│   ├── courts.ts                # Court API
│   └── bookings.ts              # Booking API
├── libs/redux/
│   ├── store.ts                 # Redux store
│   └── slices/
│       └── bookingSlice.ts       # Booking reducer
└── locales/
    ├── en.json                  # English translations
    └── th.json                  # Thai translations
```

## Support

For issues or questions about the court booking feature:
1. Check the component prop types in the source files
2. Verify backend API responses match expected types
3. Check Redux state in React DevTools
4. Monitor browser console for errors
