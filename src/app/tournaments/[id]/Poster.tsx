'use client'
import { Button, Container } from '@mui/material'


const Poster = ({ img }:{img:string}) => {
  return (
    <Container maxWidth="xl">
      <Button  href={img} fullWidth variant='outlined' >ดูโปสเตอร์</Button>
    </Container>
  )
}
export default Poster