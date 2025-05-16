'use client'

import { useForm } from 'react-hook-form'
import {
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { useAppDispatch } from '@/app/libs/redux/store'
import { login } from '@/app/libs/redux/slices/appSlice'
import axios from 'axios'
import { Dispatch, SetStateAction } from 'react'
import Transition from '../ModalTransition'
import { useTranslation } from 'react-i18next'
import { SERVICE_ENDPOINT } from '@/app/constants'
import Link from 'next/link'

interface LoginModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
}

type LoginFormInputs = {
  email: string;
  password: string;
  rememberMe: boolean;
}

const LoginModal = ({ visible, setVisible }: LoginModalProps) => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>()

  const onSubmit = async(data: LoginFormInputs) => {
    try {
      const { data: loginData } = await axios.post(
        `${SERVICE_ENDPOINT}/users/login`,
        {
          email: data.email.toLowerCase(),
          password: data.password,
        },
        {
          withCredentials: true,
        }
      )
      const savedLoginData = {
        id: loginData.user.id,
        email: loginData.user.email,
        player: loginData.player,
      }
      dispatch(login(savedLoginData))
      setVisible(false)
    }catch (error) {
      console.error('Login error:', error)
      setVisible(false)
      alert(t('login.error'))
    }
  }

  return (
    <Dialog
      data-testid="login-modal"
      open={visible}
      onClose={() => setVisible(false)}
      slots={{ transition: Transition }}
    >

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ maxWidth: 400, mx: 'auto' }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          {t('login.title')}
        </DialogTitle>
        <DialogContent dividers>
          {/* <form onSubmit={handleSubmit(onSubmit)} noValidate> */}
          <TextField
            label={t('login.email')}
            fullWidth
            margin="normal"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value:
                  /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                message: 'Invalid email address',
              },
            })}
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <TextField
            label={t('login.password')}
            type="password"
            fullWidth
            margin="normal"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />

          {/* <Link href="/forgot-password" className='text-blue-500 text-sm'>
            {t('login.forgotPassword')}
          </Link> */}

          {/* <FormControlLabel
            control={
              <Checkbox
                {...register('rememberMe')}
                defaultChecked={true}
              />
            }
            label={t('login.rememberMe')}
          /> */}

          {/* <Divider sx={{ my: 2 }} /> */}
          <div>
            <span className='text-sm'>
              {t('login.notMember')}
              <Link href="/register" className='text-blue-500 text-sm' onClick={() => setVisible(false)}>
                {t('login.register')}
              </Link>
            </span>
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => setVisible(false)}>
            {t('action.cancel')}
          </Button>
          <Button type="submit" variant='contained' autoFocus>
            {t('action.login')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
export default LoginModal
