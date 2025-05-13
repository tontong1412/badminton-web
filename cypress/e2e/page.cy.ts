//TODO: fix test
describe.skip('Playing Sessions Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
    cy.contains('Badminstar')
    cy.contains('Host a Session')
    cy.contains('Host a Session').click()
    cy.url().should('include', 'sessions')
  })
  it('should be able to add player', () => {
    cy.get('[data-test-id="add-player-button"]').click()
    cy.contains('label', 'Official Name').parent().find('input').type('Kaito Kuroba')
    cy.contains('label', 'Nick Name').parent().find('input').type('Kid')
    cy.contains('label', 'Level').parent().find('.MuiSelect-select').click()
    cy.get('.MuiMenuItem-root').contains('Intermediate').click()
    cy.contains('label', 'Level').parent().find('.MuiSelect-select').should('have.text', 'Intermediate')

    cy.get('.MuiButton-contained').contains('Add').click()

    cy.get('.MuiListItemText-root > .MuiTypography-body1').contains('Kid')
    cy.get('.MuiTypography-body2').contains('Kaito Kuroba')
    cy.get('.MuiChip-label').contains('unpaid')
  })
  it('should be able to delete player', () => {
    cy.get('[data-test-id="add-player-button"]').click()
    cy.contains('label', 'Official Name').parent().find('input').type('Kaito Kuroba')
    cy.contains('label', 'Nick Name').parent().find('input').type('Kid')
    cy.contains('label', 'Level').parent().find('.MuiSelect-select').click()
    cy.get('.MuiMenuItem-root').contains('Intermediate').click()
    cy.contains('label', 'Level').parent().find('.MuiSelect-select').should('have.text', 'Intermediate')

    cy.get('.MuiButton-contained').contains('Add').click()

    cy.get('.MuiListItemText-root > .MuiTypography-body1').contains('Kid')
    cy.get('.MuiTypography-body2').contains('Kaito Kuroba')
    cy.get('.MuiChip-label').contains('unpaid')

    cy.get('[aria-label="delete"]').click()

    cy.get('body').should('not.contain', 'Kaito Kuroba')
    cy.get('body').should('not.contain', 'Kid')
  })
})