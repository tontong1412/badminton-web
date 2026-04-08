import matchCalculator from '@/app/libs/tournaments/matchCalculator'

describe('test matchCalculator', () => {
  it('calculate correctly', () => {
    const events = [
      { limit: 72, numberOfGroup: 16, label: 'N,N+' },
      { limit: 64, numberOfGroup: 16, label: '0' },
      { limit: 24, numberOfGroup: 8, label: 'S' },
      { limit: 18, numberOfGroup: 6, label: 'P' },
      // { limit: 16, numberOfGroup: 4, label: 'N' },
      // { limit: 16, numberOfGroup: 4, label: 'N+' },
      // { limit: 16, numberOfGroup: 4, label: 'S' },
      // { limit: 16, numberOfGroup: 4, label: 'S+' },
      // { limit: 16, numberOfGroup: 4, label: 'P-' },
      // { limit: 16, numberOfGroup: 4, label: 'ทั่วไป' },
      // { limit: 16, numberOfGroup: 4, label: 'MS' },
    ]
    const result = matchCalculator(events, 8, 25)
    console.log(Math.ceil(result))
  })
})