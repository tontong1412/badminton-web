import { ReactNode } from 'react'
import TournamentFooter from './TournamentFooter'
import Header from './Header'
import MainContent from './Content'

interface Props {
  children: ReactNode;
  isManager: boolean
}

const TournamentLayout = ({ children, isManager }: Props) => {
  return (
    <div>
      <Header />
      <MainContent>
        {children}
      </MainContent>
      <TournamentFooter isManager={isManager} />
    </div>
  )
}
export default TournamentLayout
