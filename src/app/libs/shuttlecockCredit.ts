import { Match } from '@/type'

export const buildShuttlecockUsedByTeam = (matches: Match[] | undefined): Record<string, number> => {
  if (!matches) {
    return {}
  }

  return matches.reduce<Record<string, number>>((acc, match) => {
    const used = Number(match.shuttlecockUsed) || 0

    if (used <= 0) {
      return acc
    }

    const teamIDs = [match.teamA?.id, match.teamB?.id].filter((teamID): teamID is string => Boolean(teamID))

    teamIDs.forEach((teamID) => {
      acc[teamID] = (acc[teamID] || 0) + used
    })

    return acc
  }, {})
}

export const getRemainingShuttlecockCredit = (
  boughtCredit: number,
  teamID: string,
  usedByTeam: Record<string, number>,
): number => {
  return boughtCredit - (usedByTeam[teamID] || 0)
}
