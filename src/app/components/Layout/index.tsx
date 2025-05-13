import { ReactNode } from 'react'
import Footer from './Footer'
import Header from './Header'
import MainContent from './Content'


const Layout = ({ children }: {children:ReactNode}) => {
  return (
    <div>
      <Header />
      <MainContent>
        {children}
      </MainContent>
      <Footer/>
    </div>
  )
}
export default Layout
