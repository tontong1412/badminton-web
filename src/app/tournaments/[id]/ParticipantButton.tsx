'use client'
import { Button, Container } from '@mui/material'
import { useRouter } from 'next/navigation'

interface Props {
  id: string;
}


const ParticipantButton = ({ id }: Props) => {
  const router = useRouter()
  return (
    <Container maxWidth="xl" sx={{ p: 2 }}>
      <Button fullWidth variant='contained' onClick={() => router.push(`/tournaments/${id}/participants`)}>ดูรายชื่อ</Button>
    </Container>
  )
}

export default ParticipantButton