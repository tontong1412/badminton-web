import { MatchStatus, type Match } from '@/type'
import { mergeMatchesById } from '@/app/libs/data'

const createMatch = (id: string, status: MatchStatus = MatchStatus.Waiting): Match => ({
  id,
  date: '2026-09-27T10:00:00.000Z',
  status,
  shuttlecockUsed: 0,
  scoreLabel: [],
  teamA: {
    id: `${id}-team-a`,
    players: [],
    scoreSet: 0,
    score: 0,
    serving: 0,
    isServing: false,
    receiving: 0,
    scoreDiff: 0,
  },
  teamB: {
    id: `${id}-team-b`,
    players: [],
    scoreSet: 0,
    score: 0,
    serving: 0,
    isServing: false,
    receiving: 0,
    scoreDiff: 0,
  },
})

describe('mergeMatchesById', () => {
  it('replaces the matching match while preserving the list order', () => {
    const existing = [createMatch('m-1'), createMatch('m-2'), createMatch('m-3')]
    const updated = { ...createMatch('m-2', MatchStatus.Playing), scoreLabel: ['11-9'] }

    expect(mergeMatchesById(existing, updated)).toEqual([
      existing[0],
      updated,
      existing[2],
    ])
  })

  it('appends the match when it is not already in the list', () => {
    const existing = [createMatch('m-1')]
    const inserted = { ...createMatch('m-2', MatchStatus.Finished), scoreLabel: ['21-18'] }

    expect(mergeMatchesById(existing, inserted)).toEqual([
      existing[0],
      inserted,
    ])
  })
})
