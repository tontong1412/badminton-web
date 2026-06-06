import { SERVICE_ENDPOINT } from '@/app/constants'
import axios from 'axios'
import { notFound } from 'next/navigation'
import Layout from '@/app/components/Layout'
import PlayerDetailClient from '@/app/players/[id]/PlayerDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

const getPlayerHistory = async(id: string) => {
  try{
    const res = await axios.get(`${SERVICE_ENDPOINT}/players/${id}/history`)
    const playerHistory = res.data
    if(!playerHistory) notFound()
    return playerHistory
  }catch(error){
    console.log(error)
    notFound()
  }

}

const Page = async({ params }: Props) => {
  const { id } = await params
  const playerHistory = await getPlayerHistory(id)

  return (
    <Layout>
      <PlayerDetailClient player={playerHistory} />
    </Layout>
  )
}

export default Page