import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../src/app/page'
import { useRouter } from 'next/navigation'
import { vi, expect, Mock } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// TODO: Fix the test
describe.skip('Home Component', () => {
  it('renders the title and button', () => {
    render(<Home />)

    expect(screen.getByText('Badminstar')).toBeInTheDocument()

    const button = screen.getByRole('button', { name: /Host a Session/i })
    expect(button).toBeInTheDocument()
  })

  it('navigates to /sessions when button is clicked', async() => {
    const user = userEvent.setup()
    const mockPush = vi.fn();
    (useRouter as Mock).mockReturnValue({ push: mockPush })

    render(<Home />)

    const button = screen.getByRole('button', { name: /Host a Session/i })
    await user.click(button)

    expect(mockPush).toHaveBeenCalledWith('/sessions')
  })
})
