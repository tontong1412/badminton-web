import { Player } from '@/type'

export const fetchPlayers = (): Player[] => {
  const players = JSON.parse(localStorage.getItem('players') || '[]')
  return players as Player[]
}

export const updatePlayers = (updatedPlayers: Player[]) => {
  const playerString = JSON.stringify(updatedPlayers)
  localStorage.setItem('players', playerString)
}