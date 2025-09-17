'use client'
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: {
      light: '#9c795f',
      main: '#80644f',
      dark: '#695241',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff7961',
      main: '#FFDB8F',
      dark: '#ba000d',
      contrastText: '#000',
    },
    error: {
      main: '#ff7961',
      contrastText: '#fff',
    }
  },
  cssVariables: true,
  typography: {
    fontFamily: 'var(--font-nunito)',
  },
})

export default theme
