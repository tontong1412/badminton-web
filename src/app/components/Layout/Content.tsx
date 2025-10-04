'use client'
import { Box } from '@mui/material'
import { ReactNode } from 'react'

const MainContent = ({ children, noFooter }: { children:ReactNode, noFooter?: boolean }) => {
  const heightOffsetBottom = noFooter ? 0 : 56
  return (
    <Box sx={{
      overflowY:'auto',
      height: {
        xs: `calc(100vh - ${56 + heightOffsetBottom}px)`,
        md: `calc(100vh - ${64 + heightOffsetBottom}px)`
      },
      marginTop: {
        xs:`${56}px`,
        md: `${64}px`
      },
      marginBottom: noFooter ? 0 : `${56}px`
    }}>
      {children}
    </Box>
  )
}

export default MainContent
