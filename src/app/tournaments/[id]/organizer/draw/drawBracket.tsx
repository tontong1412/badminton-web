import Transition from '@/app/components/ModalTransition'
import { Event, EventTeam } from '@/type'
import { Edit } from '@mui/icons-material'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { Dispatch, SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'
const height = 50
const lineWidth = 50

interface Props {
  draw: Event['draw']
  order: (EventTeam|string)[]
  blockWidth?: number
  setDraw?: Dispatch<SetStateAction<Event['draw']>>
}

const DrawBracket = ({ draw, order, blockWidth = 400, setDraw }: Props) => {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<number>(-1)
  const [place, setPlace] = useState('')
  const [group, setGroup] = useState('')
  const { t } = useTranslation()
  const teamCount = order.length

  const onClickEdit = (drawOrder: number) => {
    setEditModalVisible(true)
    setSelectedOrder(drawOrder)
  }

  const onCloseModal = () => {
    setEditModalVisible(false)
    setPlace('')
    setGroup('')
    setSelectedOrder(-1)
  }

  const onUpdateKODraw = () => {
    const newOrderText = `ที่ ${place} กลุ่ม ${group}`
    if(!draw.ko || selectedOrder < 0 || !setDraw) return
    const tempDrawKO = [...draw.ko]
    tempDrawKO[selectedOrder] = newOrderText
    setDraw({ ...draw, ko: tempDrawKO })
    onCloseModal()
  }




  return (
    <>
      <div style={{ display: 'flex' }}>
        <div>
          {order.map((team, i) => {
            return(
              <div
                key={i}
                style={{
                  width: `${blockWidth}px`,
                  height: `${height}px`,
                  borderBottom: '1px solid #333',
                  borderRight: i % 2 === 1 ? '1px solid #333' : undefined,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '10px',
                  justifyContent: 'space-between'
                }}>
                <div style={{ display:'flex' }}>
                  <div style={{ marginRight: '5px', width: '20px' }}>{i + 1}</div>
                  <div>{(typeof team === 'string' || team === null) ? team : team.id}</div>
                </div>
                {setDraw && <div style={{ marginRight: '10px' }} onClick={() => onClickEdit(i)}>< Edit/></div>}
              </div>
            )
          })}
        </div>

        {
          [... new Array(Math.ceil(Math.log2(teamCount || 1)))].map((round, i) => (
            <div key={`round-${i}`} style={{ paddingTop: `${(height / 2) + (i < 3 ? i : Math.pow(2, i - 1)) * height}px` }}>
              {[... new Array(teamCount - (i < 3 ? i : Math.pow(2, i - 1)))].map((team, j) => {
                return <div
                  key={`key-${i * teamCount - (i < 3 ? i : Math.pow(2, i - 1)) + j}`}
                  style={{
                    width: `${lineWidth}px`,
                    height: `${height}px`,
                    borderLeft: ((i !== 0) && (j % Math.pow(2, i + 1) < Math.pow(2, i)) ? '1px solid #333' : undefined),
                    borderBottom: j % Math.pow(2, i + 1) === (i < 2 ? 0 : Math.pow(2, i - 1) - 1) ? '1px solid #333' : undefined
                  }} />
              })}
            </div>
          ))
        }


      </div>
      <Dialog
        fullWidth
        data-testid="note-modal"
        open={editModalVisible}
        onClose={onCloseModal}
        slots={{ transition: Transition }}
      >

        <Box>
          <DialogTitle sx={{ m: 0, p: 2 }} id="contact-person-dialog-title">
            {t('tournament.draw.editKODraw')}
          </DialogTitle>
          <DialogContent dividers>
            <TextField
              value={place}
              label={t('tournament.draw.placeInGroup')}
              onChange={(e) => setPlace(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              value={group}
              label={t('tournament.draw.groupName')}
              onChange={(e) => setGroup(e.target.value)}
              fullWidth
              margin="normal"
            />

          </DialogContent>
          <DialogActions>
            <Button variant='outlined' onClick={onCloseModal}>
              {t('action.close')}
            </Button>
            <Button variant='contained' onClick={onUpdateKODraw}>
              {t('action.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  )
}
export default DrawBracket