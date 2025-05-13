'use client'

import {  Dispatch, SetStateAction } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material'
import Transition from './ModalTransition'
import { SUPPORTED_LANG } from '../constants'
import { RootState, useAppDispatch } from '../libs/redux/store'
import { changeLanguage } from '@/app/libs/redux/slices/appSlice'
import { useTranslation } from 'react-i18next'
import { useSelector } from '../providers'

interface LanguageSettingModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
}

const LanguageSettingModal = ({ visible, setVisible }: LanguageSettingModalProps) => {
  const language = useSelector((state: RootState) => state.app.language)
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  return (
    <Dialog
      data-testid="add-player-modal"
      open={visible}
      onClose={() => setVisible(false)}
      slots={{ transition: Transition }}
    >
      <Box
        sx={{ maxWidth: 400, mx: 'auto', minWidth: 300 }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          {t('settings.language')}
        </DialogTitle>

        <DialogContent dividers>
          <div className='flex justify-center '>
            {SUPPORTED_LANG.map((lang) =>
              <div
                key={lang}
                onClick={() => dispatch(changeLanguage(lang))}
                className={`m-2 p-4 rounded-full ${lang === language ? 'bg-main text-white' : 'bg-gray-200'}`}>
                <div>{lang.toUpperCase()}</div>
              </div>)}
          </div>


        </DialogContent>

        <DialogActions>
          <Button variant='contained' onClick={() => setVisible(false)}>
            {t('action.close')}
          </Button>
        </DialogActions>
      </Box>

    </Dialog>

  )
}

export default LanguageSettingModal
