import { expect, describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '../src/app/page'

describe('Home Component', () => {
  it('renders the Next.js logo', () => {
    render(<Page/>)
    const logo = screen.getAllByAltText('Next.js logo')
    expect(logo).toBeDefined()
  })
})