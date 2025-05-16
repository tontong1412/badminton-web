'use client'
import { RootState } from '@/app/libs/redux/store'
import { Tournament } from '@/type'
import { AttachMoney, EmojiEvents } from '@mui/icons-material'
import { Box, Card, CardActionArea, CardContent, Container, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'

interface Props {
  tournament: Tournament
}

const EventList = ({ tournament }: Props) => {
  const { t } = useTranslation()
  const language = useSelector((state: RootState) => state.app.language)
  const router = useRouter()

  return (
    <Container maxWidth="xl" sx={{ p: 2 }}>
      <Typography>{t('tournament.registration.eventList')}</Typography>
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
            <Card sx={{ maxWidth: 345, minWidth: 300 }} key={e.id} onClick={() => router.push(`/tournaments/${tournament.id}/participants?event=${e.id}`)}>
              <CardActionArea>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    {e.name[language]}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {e.description}
                  </Typography>
                  <div className='flex items-end gap-2'>
                    <AttachMoney/>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {e.fee.amount} {e.fee.currency}
                    </Typography>
                  </div>
                  {e.prize &&
                      <div className='flex items-end gap-2'>
                        <EmojiEvents/>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {e.prize}
                        </Typography>
                      </div>
                  }
                </CardContent>
              </CardActionArea>
            </Card>
          ))
        }
      </Box>
    </Container>
  )
}

export default EventList