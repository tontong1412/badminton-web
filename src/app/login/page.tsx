'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { useAppDispatch } from '@/app/libs/redux/store'
import { login } from '@/app/libs/redux/slices/appSlice'
import axios from 'axios'

type LoginFormInputs = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>()

  const onSubmit = async(data: LoginFormInputs) => {
    console.log(data)
    const { data: loginData } = await axios.post(
      'http://localhost:8080/api/users/login',
      {
        email: data.email.toLowerCase(),
        password: data.password,
      }
    )
    const savedLoginData = {
      id: loginData.user.id,
      email: loginData.user.email,
      player: loginData.player,
    }
    dispatch(login(savedLoginData))
    if(data.rememberMe){
      localStorage.setItem('rememberMe', data.rememberMe.toString())
      localStorage.setItem('login', JSON.stringify(savedLoginData))
    }
    router.push('/')
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f5f5f5"
      px={2}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Login
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
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
            label="Password"
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

          <FormControlLabel
            control={
              <Checkbox
                {...register('rememberMe')}
                defaultChecked={true}
              />
            }
            label="Remember Me"
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            type="submit"
          >
            Log In
          </Button>
        </form>
      </Paper>
    </Box>
  )
}
