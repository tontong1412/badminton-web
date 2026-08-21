import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ReactNode } from 'react'
import VenueTimetablePage from '@/app/venues/[id]/admin/timetable/page'
import { PaymentStatus, BookingStatus, BookingType, BookingResaleOutcome } from '@/type'

vi.mock('@/app/components/Layout/index', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const { mockGetVenueBookings } = vi.hoisted(() => ({
  mockGetVenueBookings: vi.fn(),
}))

vi.mock('@/app/services/bookings', () => ({
  default: {
    getVenueBookings: mockGetVenueBookings,
  },
}))

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'venue-1' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const mockState = {
  app: {
    user: { id: 'owner-1', role: 'admin' },
    userReady: true,
  },
}

vi.mock('react-redux', async() => {
  const actual = await vi.importActual<typeof import('react-redux')>('react-redux')
  return {
    ...actual,
    useSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  }
})

const sampleBookings = [
  {
    id: 'booking-1',
    bookingBundleID: 'bundle-1',
    bookingRef: 'BK-0001',
    courtID: 'court-1',
    date: '2026-08-18',
    startTime: '08:00',
    endTime: '09:00',
    durationMinutes: 60,
    totalPrice: 350,
    currency: 'THB',
    bookerType: 'guest' as const,
    guestName: 'John Doe',
    bookingType: BookingType.SingleShot,
    status: BookingStatus.Confirmed,
    paymentStatus: PaymentStatus.Paid,
    resaleOutcome: BookingResaleOutcome.None,
    selectedAddOns: [{ id: 'ac', name: 'Air Conditioning', price: 100, details: 'Cool air all session' }],
    addOnTotalPrice: 100,
  },
]

vi.mock('@/app/libs/data', () => ({
  useVenue: () => ({
    venue: {
      id: 'venue-1',
      name: { en: 'Venue One', th: 'Venue One' },
      ownerUserID: 'owner-1',
      managerUserIDs: [],
    },
    isLoading: false,
  }),
  useCourts: () => ({
    courts: [{
      id: 'court-1',
      venueID: 'venue-1',
      name: 'Court 1',
      pricePerHour: 300,
      currency: 'THB',
      status: 'active',
    }],
  }),
  useVenueBookings: (params?: { paymentStatus?: string }) => ({
    bookings: params?.paymentStatus === 'pending' ? [] : sampleBookings,
    isLoading: false,
    mutate: vi.fn(),
  }),
}))

describe('VenueTimetable add-ons display', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockReplace.mockReset()
    mockGetVenueBookings.mockReset()
    vi.useRealTimers()
  })

  it('shows add-on badge in cell and add-on details in booking dialog', async() => {
    const user = userEvent.setup()
    render(<VenueTimetablePage />)

    expect(screen.getByText('+1 add-on')).toBeInTheDocument()

    await user.click(screen.getByText('08:00–09:00'))

    expect(screen.getByText('Add-ons')).toBeInTheDocument()
    expect(screen.getByText('Air Conditioning')).toBeInTheDocument()
    expect(screen.getByText('Cool air all session')).toBeInTheDocument()
    expect(screen.getByText('Add-on subtotal')).toBeInTheDocument()
  })

  it('does not fetch search results until the query has at least 3 characters', async() => {
    const user = userEvent.setup()
    render(<VenueTimetablePage />)

    await user.type(screen.getByPlaceholderText('Search booking ref, name, phone, or email'), 'ab')
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(screen.getByText('Enter at least 3 characters to search.')).toBeInTheDocument()
    expect(mockGetVenueBookings).not.toHaveBeenCalled()
  })

  it('fetches search results and clears them with the clear button', async() => {
    const user = userEvent.setup()
    mockGetVenueBookings.mockResolvedValue([
      {
        ...sampleBookings[0],
        id: 'booking-search-1',
        bookingRef: 'BK-SEARCH',
        date: '2026-08-21',
        guestName: 'Johnny Search',
      },
    ])

    render(<VenueTimetablePage />)

    const input = screen.getByPlaceholderText('Search booking ref, name, phone, or email')
    await user.type(input, 'joh')

    await waitFor(() => {
      expect(mockGetVenueBookings).toHaveBeenCalledWith({ venueID: 'venue-1', search: 'joh' })
    })
    expect(await screen.findByText(/BK-SEARCH/)).toBeInTheDocument()

    await user.click(screen.getByLabelText('Clear booking search'))

    expect(input).toHaveValue('')
    await waitFor(() => {
      expect(screen.queryByText('Search results')).not.toBeInTheDocument()
    })
  })
})
