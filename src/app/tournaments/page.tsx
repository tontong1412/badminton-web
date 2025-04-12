'use client'
import { TournamentQuery } from '@/type'
import { Container } from '@mui/material'
import TournamentList from './TounamentList'

const Tournaments = () => {
  return (
    <Container maxWidth="xl">
      <TournamentList query={TournamentQuery.ThisWeek} label="This Week" />
      <TournamentList query={TournamentQuery.RegistrationOpen} label="Registration Open" />
      <TournamentList query={TournamentQuery.Recent} label="Recent" />
    </Container>
  )
}

export default Tournaments