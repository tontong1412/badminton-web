import { expect, describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '../src/app/page'

describe('Home Component', () => {
  it('renders Badminstar', () => {
    render(<Page/>)
    const content = screen.getByText('Badminstar')
    expect(content).toBeDefined()
  })
})