describe('Next.js Page', () => {
  it('front page can be opened', () => {
    cy.visit('http://localhost:3000')
    cy.contains('Get started by editing')
    cy.contains('Save and see your changes instantly.')
  })
})