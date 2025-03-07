import { ReactNode } from 'react'
import Footer from './Footer'
import Header from './Header'


const Layout = ({ children }: {children:ReactNode}) => {
  return (
    <div>
      <Header/>
      {children}
      <Footer/>
    </div>
  )
}
export default Layout
