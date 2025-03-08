import { Fab } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

const fabStyle = {
  position: 'absolute',
  bottom: 80,
  right: 20
}

interface FloatingAddButtonProps {
  onClick: (...args: unknown[]) => void,
  'data-test-id'?: string  // Add this to the interface
}

const FloatingAddButton = ({ onClick, ...props }: FloatingAddButtonProps) => {
  return (
    <Fab color='primary' sx={fabStyle} onClick={onClick} {...props}>
      <AddIcon />
    </Fab>
  )
}

export default FloatingAddButton