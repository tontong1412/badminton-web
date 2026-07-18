'use client'
import { Language, Tournament, TournamentQuery, TournamentStatus } from '@/type'
import { CalendarMonth, LocationOn } from '@mui/icons-material'
import { Box, Card, CardActionArea, CardContent, CardMedia, CircularProgress, Typography } from '@mui/material'
import moment from 'moment'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from '../providers'
import { RootState } from '../libs/redux/store'
import { SERVICE_ENDPOINT } from '../constants'

interface TournamentListProps {
  query: TournamentQuery | TournamentQuery[]
  label?: string
  statuses?: TournamentStatus[]
}

const TournamentList = ({ query, label, statuses }: TournamentListProps) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const queryList = Array.isArray(query) ? query : [query]
  const queryKey = queryList.join(',')

  useEffect(() => {
    const fetchTournaments = async() => {
      try {
        const responses = await Promise.all(
          queryList.map((tab) => fetch(`${SERVICE_ENDPOINT}/tournaments?tab=${tab}`))
        )
        const payloads = await Promise.all(responses.map((response) => response.json()))
        const merged = payloads.flat() as Tournament[]
        const deduplicated = Array.from(
          new Map(merged.map((tournament) => [String(tournament.id), tournament])).values()
        )
        const sorted = deduplicated.sort((a, b) => moment(a.startDate).valueOf() - moment(b.startDate).valueOf())
        const filtered = statuses?.length
          ? sorted.filter((tournament) => tournament.status && statuses.includes(tournament.status))
          : sorted

        setTournaments(filtered)
        setError(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetchTournaments()
  }, [queryKey, statuses])

  if (loading) return <CircularProgress/>
  if (error) return <p>Error: {error}</p>

  return (
    <Box maxWidth="xl" sx={{ mt: 1, mb: 3 }}>
      {label && <Typography gutterBottom variant="h5" component="div">
        {label}
      </Typography>}
      {tournaments.length > 0 ? (
        <Box style={{ display: 'flex', flexWrap: 'nowrap', gap: '5px', overflowX: 'scroll' }}>
          {tournaments.map((tournament: Tournament) => (
            <Card
              key={tournament.id}
              onClick={() => router.push(`/tournaments/${tournament.id}`)}
              sx={{ mt:'1px', mb:'1px', ml:'1px', display: 'flex', minWidth: 350, maxWidth: 400 }}>
              <CardActionArea sx={{ display: 'flex' }}>
                <CardMedia
                  component="img"
                  sx={{ width: 151 }}
                  image={tournament.logo || '/avatar.png'}
                  alt={tournament.name?.en}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: '1 0 auto' }}>
                    <Typography component="div" variant="h5" sx={{ fontSize: '1.2rem', elipsis: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {tournament.name?.en}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      component="div"
                      sx={{ color: 'text.secondary' }}
                    >
                      <LocationOn sx={{ fontSize: 'small', marginRight: 1 }} />
                      {tournament.venue?.name?.[language]}
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
    </Box>
  )
}

export default TournamentList