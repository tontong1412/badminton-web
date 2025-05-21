'use client'
import { Container, Button, TextField, Typography } from '@mui/material'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SERVICE_ENDPOINT } from '../../constants'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

type ResetPasswordFormInputs = {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormInputs>()
  const password = watch('password')

  const onSubmit = async(data: ResetPasswordFormInputs) => {
    try {
      await axios.post(`${SERVICE_ENDPOINT}/users/reset-password/${params.token}`, {
        password: data.password,
      }, { withCredentials: true })

      router.push('/')
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
        {t('login.resetPassword')}
      </Typography>

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

      <Button type="submit" variant='contained'  fullWidth autoFocus>
        {t('action.confirm')}
      </Button>
    </Container>
  )
}
export default ResetPassword