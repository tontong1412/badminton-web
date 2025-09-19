import { ReactNode } from 'react'
import TournamentFooter from './TournamentFooter'
import Header from './Header'
import MainContent from './Content'
import { Tournament } from '@/type'

interface Props {
  children: ReactNode
  tournament: (Tournament | undefined)
}

const TournamentLayout = ({ children, tournament }: Props) => {
  return (
    <div>
      <Header />
      <MainContent>
        {children}
      </MainContent>
      <TournamentFooter tournament={tournament}/>
    </div>
  )
}
export default TournamentLayout
