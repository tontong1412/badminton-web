import { SERVICE_ENDPOINT } from '@/app/constants'
import { Box, Typography } from '@mui/material'
import axios from 'axios'
import { notFound } from 'next/navigation'
import TournamentCover from './TournamentCover'
import EventList from './EventList'

interface Props {
  params: Promise<{ id: string }>
}

const getTournament = async(id: string) => {
  try{
    const res = await axios.get(`${SERVICE_ENDPOINT}/api/tournaments/${id}`)
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
    const response = await axios.get(`${SERVICE_ENDPOINT}/api/tournaments?tab=thisWeek`)
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
    <Box>
      <TournamentCover tournament={tournament} />
      <EventList tournament={tournament} />

      <Box component="section" sx={{ p: 2, border: '1px dashed grey' }}>
        <Typography >
          ดูรายชื่อ
        </Typography>
      </Box>
    </Box>
  )
}

export default Page