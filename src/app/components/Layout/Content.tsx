'use client'
import { Box } from '@mui/material'
import { ReactNode } from 'react'

const MainContent = ({ children }: { children:ReactNode }) => {

  return (
    <Box sx={{
      overflowY:'auto',
      height: {
        xs: `calc(100vh - ${56 + 56}px)`,
        md: `calc(100vh - ${64 + 56}px)`
      },
      marginTop: {
        xs:`${56}px`,
        md: `${64}px`
      },
      marginBottom: `${56}px`
    }}>
      {children}
    </Box>
  )
}

export default MainContent
