'use client'
import DeleteIcon from '@mui/icons-material/Delete'
import Avatar from '@mui/material/Avatar'
import { IconButton, List, ListItem, Typography, ListItemAvatar, ListItemText, Box, Chip } from '@mui/material'
import { Player } from '@/type'
import { useEffect, useState } from 'react'
import AddPlayerModal from '../components/AddPlayerModal'
import { fetchPlayers, updatePlayers } from '../libs/fetchData'
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye'
import FloatingAddButton from '../components/FloatingAddButton'

const Session = () => {
  const [addPlayerModalVisible, setAddPlayerModalVisible] = useState<boolean>(false)
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    const getPlayer = async() => {
      const fetchedPlayers = await fetchPlayers()
      setPlayers(fetchedPlayers)
    }
    getPlayer()
  }, [])

  const removePlayer = (id: string) => {
    const remainingPlayers = players.filter((player) => player.id !== id)
    updatePlayers(remainingPlayers)
    setPlayers(remainingPlayers)
  }

  return (
    <div>
      <Typography sx={{ mt: 4, mb: 2 }} variant="h6" component="div">
        Aurora Badminton
      </Typography>
      <Typography className='w-full flex justify-end' variant='body1'>{`Participants: ${players.length}/${30}`}</Typography>
      <List>
        {players.map((player: Player) => (
          <ListItem
            divider
            key={player.id}
            secondaryAction={
              <Box className='flex gap-4 items-center'>
                <Chip label={player.paymentStatus} color='error'  variant="outlined" size="small"/>
                <IconButton edge="end" aria-label="delete" onClick={() => removePlayer(player.id)}>
                  <DeleteIcon />
                </IconButton>
                <IconButton edge="end" aria-label="see-detail" onClick={() => console.log(player.id)}>
                  <RemoveRedEyeIcon />
                </IconButton>
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar src={player.photo || 'avatar.png'}/>
            </ListItemAvatar>
            <ListItemText
              primary={player.displayName || player.officialName}
              secondary={player.displayName ? player.officialName : null}
            />
          </ListItem>
        ))}

      </List>
      <AddPlayerModal visible={addPlayerModalVisible} setVisible={setAddPlayerModalVisible} players={players} setPlayers={setPlayers}/>
      <FloatingAddButton data-test-id='add-player-button' onClick={() => setAddPlayerModalVisible(true)}/>
    </div>
  )
}

export default Session
