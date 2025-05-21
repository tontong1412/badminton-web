'use client'
import { Container, Button, TextField, Typography, Alert } from '@mui/material'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SERVICE_ENDPOINT } from '../constants'
import { useState } from 'react'
import { Check } from '@mui/icons-material'

type ForgotPasswordFormInputs = {
  email: string;
}

const ForgotPassword = () => {
  const { t } = useTranslation()
  const [alertOpen, setAlertOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormInputs>()

  const onSubmit = async(data: ForgotPasswordFormInputs) => {
    try {
      await axios.post(`${SERVICE_ENDPOINT}/users/forgot-password`, {
        email: data.email,
      }, { withCredentials: true })
      setAlertOpen(true)
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
      {alertOpen && <Alert  icon={<Check fontSize="inherit" />} severity="success">
        {t('login.resetPasswordLinkSent')}
      </Alert>}
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {t('login.forgotPassword')}
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

      <Button type="submit" variant='contained'  fullWidth autoFocus>
        {t('action.confirm')}
      </Button>
    </Container>
  )
}
export default ForgotPassword