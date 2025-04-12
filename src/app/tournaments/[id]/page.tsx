import { SERVICE_ENDPOINT } from '@/app/constants'
import { Box, Button, Card, CardActionArea, CardContent, Container, Typography } from '@mui/material'
import axios from 'axios'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { LocationOn, CalendarMonth, EmojiEvents } from '@mui/icons-material'
import moment from 'moment'

interface Props {
  params: Promise<{ id: string }>
}

const getTournament = async(id: string) => {
  const res = await axios.get(`${SERVICE_ENDPOINT}/api/tournaments/${id}`)
  const tournament = res.data
  if(!tournament) notFound()
  return tournament
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
      <Box sx={{ width: '100%', backgroundColor: '#80644f' }}>
        <Container maxWidth="xl" sx={{ p: 2, display:'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box
            component="section"
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center' }}>
            <div>
              <Image
                src={tournament.photo || '/avatar.png'}
                alt={tournament.name.en}
                width={200}
                height={200}
                className='rounded-full shadow-md object-cover'
              />
            </div>
          </Box>

          <Box component="section" sx={{ p: 2,  width: '100%', display: 'flex', flexDirection: 'column', alignItems:{ xs: 'center', md: 'flex-start' } }}>
            <div className='text-gray-200'>
              <h1 className='text-2xl'>{tournament.name.en}</h1>
              <Box sx={{ pt:1  }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}><LocationOn/><Typography>{tournament.venue.name.en}</Typography></Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}><CalendarMonth/><Typography>{`${moment(tournament.startDate).format('DD MMM')} to ${moment(tournament.endDate).format('DD MMM')}`}</Typography></Box>
              </Box>
            </div>
            <Box sx={{ paddingTop: 3 }}>
              <Button variant='contained' size="large" sx={{ borderRadius: 5, backgroundColor: '#ff7961' }}>Register</Button>
            </Box>

          </Box>
        </Container>
      </Box>

      <Box component="section" sx={{ p: 2 }}>
        <Typography>รายการที่รับสมัคร</Typography>
        <Box component="section" sx={{
          p: '1px',
          width: '100%',
          display: 'flex',
          gap: 2,
          flexWrap: { xs: 'nowrap', md: 'wrap' },
          overflowX: 'auto'
        }}>
          {
            tournament.events.map((e) => (
              <Card sx={{ maxWidth: 345, minWidth: 300 }} key={e.id}>
                <CardActionArea>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      {e.name.local}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {e.description}
                    </Typography>

                    <div className='flex items-end gap-2'>
                      <EmojiEvents/>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {e.prize}
                      </Typography>
                    </div>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          }
        </Box>
      </Box>

      <Box component="section" sx={{ p: 2, border: '1px dashed grey' }}>
        <Typography >
          ดูรายชื่อ
        </Typography>
      </Box>
    </Box>
  )
}

export default Page