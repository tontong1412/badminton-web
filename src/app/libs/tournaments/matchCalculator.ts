interface EventDetail {
  label?: string;
  limit: number;
  numberOfGroup: number;
}

const matchCalculator = (events: EventDetail[], courtUsed: number, matchDuration: number) => {
  const numberOfMatches = events.reduce((prev: number, event: EventDetail) => {
    const teamPerGroup = event.limit / event.numberOfGroup
    const matchesPerGroup = teamPerGroup * (teamPerGroup - 1) / 2 // single round-robin
    const totalMatches = matchesPerGroup * event.numberOfGroup
    return prev + totalMatches
  }, 0)

  const round = numberOfMatches / courtUsed
  const timeUsed = round * matchDuration
  const timeUsedHR = timeUsed / 60
  return timeUsedHR
}
export default matchCalculator