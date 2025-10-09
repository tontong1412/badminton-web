'use client'
import { Language, User } from '@/type'
import { Box, Button, Container, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { RootState } from '../../libs/redux/store'
import Layout from '@/app/components/Layout'
import { useEffect, useState } from 'react'
import { SERVICE_ENDPOINT } from '@/app/constants'
import axios from 'axios'
import { useAppDispatch } from '@/app/providers'
import { login } from '@/app/libs/redux/slices/appSlice'
import { useRouter } from 'next/navigation'

type ProfileFormInputs = {
  officialName: string;
  displayName?: string;
  officialNameEN?: string;
  displayNameEN?: string;
  gender?: string;
  level?: number;
  club?: string;
  birthDate?: string;
}

const EditProfilePage = () => {
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const user = useSelector((state: RootState) => state.app.user)
  const [initialData, setInitialData] = useState<ProfileFormInputs>()
  const dispatch = useAppDispatch()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileFormInputs>(
    { defaultValues: initialData }
  )

  useEffect(() => {
    if(user){
      const defaultProfileValues: ProfileFormInputs = {
        officialName: user?.player.officialName[language] || '',
        officialNameEN: user?.player.officialName['en'],
        displayName: user?.player.displayName[language] || '',
        displayNameEN: user?.player.displayName['en'],
        club: user?.player.club
      }
      setInitialData(defaultProfileValues)}
  }, [user])

  useEffect(() => {
    if(initialData){
      reset(initialData)
    }
  }, [initialData, reset])

  const onSubmit = async(data: ProfileFormInputs) => {
    if(!user) return
    const response = await axios.put(
      `${SERVICE_ENDPOINT}/players/${user?.player.id}`,
      {
        officialName: {
          [language]: data.officialName,
          en: data.officialNameEN
        },
        displayName: {
          [language]: data.displayName,
          en: data.displayNameEN,
        },
        club: data.club,
        dob: data.birthDate
      },
      { withCredentials: true }
    )
    const savedLoginData = {
      ...user,
      player: response.data as User['player'],
    }
    dispatch(login(savedLoginData))
    router.back()

  }

  return (
    <Layout>
      <Container>
        <Box
          sx={{ maxWidth:400, textAlign: 'center', mt:5 }}
          component='form'
          onSubmit={handleSubmit(onSubmit)}
        >
          <Typography variant='h4'>Edit Profile</Typography>
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
            label={t('player.displayNameEN')}
            fullWidth
            margin="normal"
            {...register('displayNameEN', {})}
            error={!!errors.displayName}
            helperText={errors.displayName?.message}
          />
          <TextField
            label={t('player.club')}
            fullWidth
            margin="normal"
            {...register('club', {})}
            error={!!errors.club}
            helperText={errors.club?.message}
          />
          <TextField
            label={t('player.dob')}
            type="date"
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
            }}
            margin="normal"
            {...register('birthDate', {})}
            error={!!errors.birthDate}
            helperText={errors.birthDate?.message}
          />

          <Button type="submit" variant='contained'  fullWidth autoFocus sx={{ mt:2 }}>
            {t('action.confirm')}
          </Button>
        </Box>
      </Container>
    </Layout>
  )
}
export default EditProfilePage