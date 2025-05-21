'use client'
import { Container, Button, TextField, Divider, Typography } from '@mui/material'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SERVICE_ENDPOINT } from '../constants'
import { Language } from '@/type'
import { useAppDispatch, useSelector } from '../providers'
import { RootState } from '../libs/redux/store'
import { useRouter } from 'next/navigation'
import { login } from '../libs/redux/slices/appSlice'
import { useEffect } from 'react'

type RegisterFormInputs = {
  email: string;
  password: string;
  confirmPassword: string;
  officialName: string;
  displayName?: string;
  officialNameEN?: string;
  displayNameEN?: string;
  gender?: string;
  level?: number;
  club?: string;
  birthDate?: string;
}

const Register = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const router = useRouter()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const user = useSelector((state: RootState) => state.app.user)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>()
  const password = watch('password')

  useEffect(() => {
    if(user){
      router.push('/')
    }
  }, [user])

  const onSubmit = async(data: RegisterFormInputs) => {
    try {
      const response = await axios.post(`${SERVICE_ENDPOINT}/users`, {
        email: data.email.toLowerCase(),
        password: data.password,
        officialName: {
          [language]: data.officialName,
          en: data.officialNameEN,
        },
        displayName: {
          [language]: data.displayName,
          en: data.displayNameEN
        },
        dob: data.birthDate,
      }, { withCredentials: true })

      const savedLoginData = {
        id: response.data.user.id,
        email: response.data.user.email,
        player: response.data.player,
      }
      dispatch(login(savedLoginData))
      router.back()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      alert(error.response?.data?.error || t('register.error'))
    }
  }
  return (
    <Container
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ width: 400, my:4 }}
    >
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {t('login.registerButton')}
      </Typography>
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

      <TextField
        label={t('login.confirmPassword')}
        type="password"
        fullWidth
        margin="normal"
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: (value) =>
            value === password || 'Passwords do not match',
        })}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
      />
      <Divider sx={{ my: 2 }}>{t('player.detail')}</Divider>
      <TextField
        label={t('player.officialName')}
        fullWidth
        margin="normal"
        {...register('officialName', {
          required: 'Full name is required',
        })}
        error={!!errors.officialName}
        helperText={errors.officialName?.message}
      />
      {language !== 'en' && <TextField
        label={t('player.officialNameEN')}
        fullWidth
        margin="normal"
        {...register('officialNameEN', {
          required: 'Full name is required',
        })}
        error={!!errors.officialNameEN}
        helperText={errors.officialNameEN?.message}
      />}
      <TextField
        label={t('player.displayName')}
        fullWidth
        margin="normal"
        {...register('displayName', {})}
        error={!!errors.displayName}
        helperText={errors.displayName?.message}
      />
      <TextField
        label={t('player.dob')}
        type="date"
        fullWidth
        slotProps={{
          inputLabel: { shrink: true },
        }}
        margin="normal"
        {...register('birthDate', {
          required: 'Birthday is required',
        })}
        error={!!errors.birthDate}
        helperText={errors.birthDate?.message}
      />

      <Button type="submit" variant='contained'  fullWidth autoFocus>
        {t('action.register')}
      </Button>
    </Container>
  )
}
export default Register