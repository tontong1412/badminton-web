'use client'

import {
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Typography,
  Alert,
} from '@mui/material'
import { RootState } from '@/app/libs/redux/store'
import { Dispatch, SetStateAction, useState } from 'react'
import Transition from '../ModalTransition'
import { useTranslation } from 'react-i18next'
import { Language, Player } from '@/type'
import { useSelector } from 'react-redux'
import { Check, CopyAll, LocalPhone } from '@mui/icons-material'

interface ContactPersonModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  player: Player
}


const ContactPersonModal = ({ visible, setVisible, player }: ContactPersonModalProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [copyAlertOpen, setCopyAlertOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <Dialog
      fullWidth
      data-testid="contact-person-modal"
      open={visible}
      onClose={() => setVisible(false)}
      slots={{ transition: Transition }}
    >

      <Box>
        <DialogTitle sx={{ m: 0, p: 2 }} id="contact-person-dialog-title">
          {t('tournament.registration.contactPerson')}
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign:'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar src={player.photo || '/avatar.png'} sx={{ width: 100, height: 100 }}/>
          <Typography>{player.officialName[language]}</Typography>
          {player.displayName && <Typography>{player.displayName[language]}</Typography>}
          <Box sx={{ display:'flex', gap: 1, alignItems: 'center' }}>
            <Typography>{`${t('tournament.registration.tel')}: `}</Typography>
            <Typography>{player.contact?.tel}</Typography>
            <a href={`tel:${player.contact?.tel}`}><LocalPhone/></a>
          </Box>

          { player.contact?.line &&
            <Box sx={{ display:'flex', gap: 1 }}>
              <Typography>Line id:</Typography>
              <Typography>{player.contact?.line}</Typography>
              <div onClick={() => {
                navigator.clipboard.writeText(player.contact?.line || '').then(() => {
                  setCopyAlertOpen(true)
                  setTimeout(() => {
                    setCopyAlertOpen(false)
                  }, 2000)
                })
              }}><CopyAll /></div>
            </Box>
          }
          {copyAlertOpen && <Alert  icon={<Check fontSize="inherit" />} severity="success">
            Copied
          </Alert>}
        </DialogContent>
        <DialogActions>
          <Button variant='contained' autoFocus onClick={() => setVisible(false)}>
            {t('action.close')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
export default ContactPersonModal
