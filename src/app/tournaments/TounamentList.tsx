'use client'
import { Language, Tournament, TournamentQuery } from '@/type'
import { CalendarMonth, LocationOn } from '@mui/icons-material'
import { Box, Card, CardActionArea, CardContent, CardMedia, Container, Typography } from '@mui/material'
import moment from 'moment'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from '../providers'
import { RootState } from '../libs/redux/store'
import { SERVICE_ENDPOINT } from '../constants'

interface TournamentListProps {
  query: TournamentQuery
  label: string
}

const TournamentList = ({ query, label }: TournamentListProps) => {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)

  useEffect(() => {
    const fetchTournaments = async() => {
      try {
        const response = await fetch(`${SERVICE_ENDPOINT}/tournaments?tab=${query}`)
        if (!response.ok) {
          throw new Error('Failed to fetch tournaments')
        }
        const data = await response.json()
        setTournaments(data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
      <Typography gutterBottom variant="h5" component="div">
        {label}
      </Typography>
      {tournaments.length > 0 ? (
        <Box style={{ display: 'flex', flexWrap: 'nowrap', gap: '5px', overflowX: 'scroll' }}>
          {tournaments.map((tournament: Tournament) => (
            <Card
              key={tournament.id}
              onClick={() => router.push(`/tournaments/${tournament.id}`)}
              sx={{ mt:'1px', mb:'1px', ml:'1px', display: 'flex', minWidth: 380, maxWidth: 400 }}>
              <CardActionArea sx={{ display: 'flex' }}>
                <CardMedia
                  component="img"
                  sx={{ width: 151 }}
                  image={tournament.logo || '/avatar.png'}
                  alt={tournament.name.en}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: '1 0 auto' }}>
                    <Typography component="div" variant="h5" sx={{ fontSize: '1.2rem', elipsis: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {tournament.name.en}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      component="div"
                      sx={{ color: 'text.secondary' }}
                    >
                      <LocationOn sx={{ fontSize: 'small', marginRight: 1 }} />
                      {tournament.venue.name[language]}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      component="div"
                      sx={{ color: 'text.secondary' }}
                    >
                      <CalendarMonth sx={{ fontSize: 'small', marginRight: 1 }} />
                      {`${moment(tournament.startDate).format('DD/MM/YY')} to ${moment(tournament.endDate).format('DD/MM/YY')}`}
                    </Typography>
                  </CardContent>
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      ) : (
        <Typography
          variant="subtitle1"
          component="div"
          sx={{ color: 'text.secondary' }} >
          {t('tournament.notfound')}
        </Typography>
      )}
    </Container>
  )
}

export default TournamentList