import { render, screen } from '@testing-library/react'
import AddPlayerModal from '@/app/components/AddPlayerModal'
import { vi, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { PaymentStatus } from '@/type'
import mockPlayers from '@/app/data/players'

vi.mock('uuid', () => ({
  v1: () => 'test-uuid-123'
}))

vi.mock('moment', () => {
  return {
    default: () => ({
      toISOString: () => '2025-03-08T12:00:00.000Z'
    })
  }
})

describe('AddPlayerModal', () => {
  it('should show form when visible is true', () => {
    const mockSetVisible = vi.fn()
    const mockSetPlayers = vi.fn()
    render(<AddPlayerModal visible setVisible={mockSetVisible} players={[]} setPlayers={mockSetPlayers}/>)

    const dialog = screen.getByTestId('add-player-modal')
    const modalHeader = screen.getByRole('heading', { name:'Add Player' })
    const textInputs = screen.getAllByRole('textbox')
    const selectLevel = screen.getByRole('combobox')
    const addButton = screen.getByRole('button', { name: 'Add' })
    expect(dialog).toBeInTheDocument()
    expect(modalHeader).toBeInTheDocument()
    expect(textInputs).toHaveLength(2)
    expect(selectLevel).toBeInTheDocument()
    expect(addButton).toBeInTheDocument()
  })

  it('should be invisible if visible is false', () => {
    const mockSetVisible = vi.fn()
    const mockSetPlayers = vi.fn()
    render(<AddPlayerModal visible={false} setVisible={mockSetVisible} players={[]} setPlayers={mockSetPlayers}/>)

    const component = screen.queryByTestId('add-player-modal')
    expect(component).not.toBeInTheDocument()
  })

  it('should update players when ADD button is clicked', async() => {
    const mockSetVisible = vi.fn()
    const mockSetPlayers = vi.fn()
    render(<AddPlayerModal visible setVisible={mockSetVisible} players={mockPlayers} setPlayers={mockSetPlayers}/>)

    const user = userEvent.setup()

    const nameInput = screen.getByRole('textbox', { name:'Official Name' })
    const nicknameInput = screen.getByRole('textbox', { name:'Nick Name' })
    const submitButton = screen.getByRole('button', { name:'Add' })

    await user.type(nameInput, 'Kaito Kuroba')
    await user.type(nicknameInput, 'Kid')

    await user.click(submitButton)

    expect(mockSetPlayers).toHaveBeenCalled()

    const updatedPlayersArg = mockSetPlayers.mock.calls[0][0]

    expect(updatedPlayersArg.length).toBe(mockPlayers.length + 1)
    expect(updatedPlayersArg).toContainEqual({
      id: 'test-uuid-123',
      officialName: 'Kaito Kuroba',
      displayName: 'Kid',
      level: 0,
      lastMatchEnd: '2025-03-08T12:00:00.000Z',
      paymentStatus: PaymentStatus.Unpaid
    })
  })

})