import { SERVICE_ENDPOINT } from '@/app/constants'
import { Box } from '@mui/material'
import axios from 'axios'
import { notFound } from 'next/navigation'
import TournamentCover from './TournamentCover'
import EventList from './EventList'
import ParticipantButton from './ParticipantButton'
import TournamentLayout from '@/app/components/Layout/TournamentLayout'

interface Props {
  params: Promise<{ id: string }>
}

const getTournament = async(id: string) => {
  try{
    const res = await axios.get(`${SERVICE_ENDPOINT}/tournaments/${id}`)
    const tournament = res.data
    if(!tournament) notFound()
    return tournament
  }catch(error){
    console.log(error)
    notFound()
  }

}

export const generateStaticParams = async() => {
  try {
    const response = await axios.get(`${SERVICE_ENDPOINT}/tournaments?tab=thisWeek`)
    const tournaments = response.data

    return tournaments.map((tournament: { id: string }) => ({
      id: tournament.id.toString(), // Ensure ID is a string
    }))
  } catch (error) {
    console.error('Error fetching tournaments for static paths:', error)
    return [] // Return empty array as fallback
  }
}

const Page = async({ params }: Props) => {
  const { id } = await params
  const tournament = await getTournament(id)
  return (
    <TournamentLayout isManager={false}>
      <Box>
        <TournamentCover tournament={tournament} />
        <EventList tournament={tournament} />
        <ParticipantButton id={id} />
      </Box>
    </TournamentLayout>
  )
}

export default Page