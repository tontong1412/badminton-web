import { Fab } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

const fabStyle = {
  position: 'absolute',
  bottom: 80,
  right: 20
}

interface FloatingAddButtonProps {
  onClick: (...args: unknown[]) => void
}

const FloatingAddButton = ({ onClick }: FloatingAddButtonProps) => {
  return (
    <Fab color='primary' sx={fabStyle} onClick={onClick}>
      <AddIcon />
    </Fab>
  )
}

export default FloatingAddButton