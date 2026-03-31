'use client'

import { Match, PlayerHistory } from '@/type'
import { useSelector } from '@/app/providers'
import { Avatar, Box, Container, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MAP_ROUND_NAME } from '@/app/constants'
import MatchUp from '@/app/tournaments/[id]/draw/Bracket/MatchUp'
import styles from '@/app/tournaments/[id]/draw/Bracket/MatchList.module.scss'

interface Props {
  player: PlayerHistory
}

const PlayerDetailClient = ({ player }: Props) => {
  const language = useSelector((state) => state.app.language)
  const router = useRouter()

  const matchesByEvent = useMemo(() => {
    const grouped = player.history.reduce((acc, item) => {
      const itemMatches = Array.isArray(item.matches) ? item.matches : (item.matches ? [item.matches] : [])
      const fallbackEvent = itemMatches[0]?.event
      const eventId = item.event?.id || fallbackEvent?.id || 'unknown-event'

      if(!acc[eventId]){
        acc[eventId] = {
          eventName: item.event?.name?.[language] || item.event?.name?.th || item.event?.name?.en || fallbackEvent?.name?.[language] || fallbackEvent?.name?.th || fallbackEvent?.name?.en || 'Unknown Event',
          tournamentName: item.event?.tournamentName?.[language] || item.event?.tournamentName?.th || item.event?.tournamentName?.en,
          matches: [] as Match[]
        }
      }

      acc[eventId].matches.push(...itemMatches)
      return acc
    }, {} as Record<string, { eventName: string; tournamentName?: string; matches: Match[] }>)

    Object.values(grouped).forEach((group) => {
      group.matches.sort((a: Match, b: Match) => {
        if(!a.matchNumber || !b.matchNumber){
          return 0
        }
        return b.matchNumber - a.matchNumber
      })
    })

    return grouped
  }, [player.history, language])

  const officialName = player?.info?.officialName?.[language] || player?.info?.officialName?.th || player?.info?.officialName?.en || '-'
  const displayName = player?.info?.displayName?.[language] || player?.info?.displayName?.th || player?.info?.displayName?.en

  return (
    <>
      <Box sx={{ width: '100%', backgroundColor: '#80644f' }}>
        <Container maxWidth='xl' sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box
            component='section'
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Avatar
              src={player?.info?.photo || '/avatar.png'}
              alt={officialName}
              sx={{ width: 200, height: 200 }}
            />
          </Box>

          <Box
            component='section'
            className='text-gray-200'
            sx={{
              p: 2,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' },
              justifyContent: 'center'
            }}
          >
            <h1 className='text-2xl'>{officialName}</h1>
            {displayName && <Typography>{displayName}</Typography>}
            <Typography> {`${player?.info?.club || '-'}`}  </Typography>

            {/* <Stack direction='row' spacing={1} mt={2} flexWrap='wrap' useFlexGap>
              <Chip label={`Level: ${player?.info?.level ?? '-'}`} size='small' sx={{ backgroundColor: 'grey.200' }} />
              {player?.info?.gender && <Chip label={`Gender: ${player.info.gender}`} size='small' sx={{ backgroundColor: 'grey.200' }} />}
            </Stack> */}

            {player?.info?.contact && (
              <Typography mt={2} color='grey.300'>
                Contact: {player.info.contact.tel || '-'} {player.info.contact.line ? `| ${player.info.contact.line}` : ''}
              </Typography>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth='xl' sx={{ p: 2 }}>
        <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
          {Object.keys(matchesByEvent).length === 0 && <Typography>No match history</Typography>}
          {Object.entries(matchesByEvent).map(([eventId, eventData]) => (
            <Box key={eventId} sx={{ mb: 2 }}>
              {/* <Typography variant='subtitle1' sx={{ mb: 1, fontWeight: 600 }}>{eventData.eventName}</Typography> */}
              {eventData.tournamentName && <Typography variant='subtitle1' sx={{ mb: 1, fontWeight: 600 }}>{eventData.tournamentName}</Typography>}
              <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                {eventData.matches.map((match) => (
                  <Box
                    key={match.id}
                    onClick={() => router.push(`/matches/${match.id}`)}
                    className={`${styles['match-list']} ${styles.matchups}`}
                    sx={{ minWidth: { xs: 320, sm: 420 }, flex: '0 0 auto' }}
                  >
                    <div style={{
                      backgroundColor: '#80644f',
                      borderTopLeftRadius: '0.25rem',
                      borderTopRightRadius: '0.25rem',
                      color: 'whitesmoke',
                      padding: '0px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}>
                      <div>{`${match.event?.name[language]}  รอบ ${match.step === 'group' ? 'แบ่งกลุ่ม' : MAP_ROUND_NAME[match.round?.toString() as keyof typeof MAP_ROUND_NAME]}`}</div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {match.status !== 'waiting' && <div>{`#${match.matchNumber}`}</div>}
                        {match.status === 'playing' && <div>{`คอร์ด - ${match.court}`}</div>}
                      </div>
                    </div>
                    <MatchUp match={match} style='list'/>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </>
  )
}

export default PlayerDetailClient
