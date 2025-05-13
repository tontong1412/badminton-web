import { Match, MatchStatus, NewTeam, Player, Team } from '@/type'
import moment from 'moment'
import { v1 as uuid } from 'uuid'

import axios from 'axios'
import { SERVICE_ENDPOINT } from '../constants'


export const fetchPlayers = async(): Promise<Player[]> => {
  const { data: players } = await axios.get(`${SERVICE_ENDPOINT}/api/players`)
  // const players = JSON.parse(localStorage.getItem('players') || '[]')
  return players as Player[]
}

export const updatePlayers = (updatedPlayers: Player[]) => {
  const playerString = JSON.stringify(updatedPlayers)
  localStorage.setItem('players', playerString)
}

export const fetchMatches = (): Match[] => {
  const matches = JSON.parse(localStorage.getItem('matches') || '[]')
  return matches as Match[]
}

export const createMatch = (teamA: NewTeam, teamB: NewTeam) => {
  const teamAWithID: Team = { ...teamA, id: uuid() }
  const teamBWithID: Team = { ...teamB, id: uuid() }
  const newMatch: Match = {
    id: uuid(),
    teamA: {
      team: teamAWithID
    },
    teamB: {
      team: teamBWithID
    },
    date: moment().toISOString(),
    status: MatchStatus.Waiting,
    shuttlecockUsed: 0
  }
  const matches = JSON.parse(localStorage.getItem('matches') || '[]')
  matches.push(newMatch)
  localStorage.setItem('matches', JSON.stringify(matches))
  return matches

}

export const updateMatch = (updatedMatch: Match) => {
  const matches = JSON.parse(localStorage.getItem('matches') || '[]')
  const indexToReplace = matches.findIndex((match: Match) => match.id === updatedMatch.id)
  if(indexToReplace !== -1){
    matches[indexToReplace] = updatedMatch
  }
  localStorage.setItem('matches', JSON.stringify(matches))
  return matches
}