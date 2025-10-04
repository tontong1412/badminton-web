import { ReactNode } from 'react'
import Footer from './Footer'
import Header from './Header'
import MainContent from './Content'


const Layout = ({ children, noFooter }: {children:ReactNode, noFooter?: boolean}) => {
  return (
    <div>
      <Header />
      <MainContent noFooter={noFooter}>
        {children}
      </MainContent>
      {!noFooter  && <Footer/>}
    </div>
  )
}
export default Layout
