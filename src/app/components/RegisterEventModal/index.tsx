import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Divider,
  Checkbox,
  Typography,
} from '@mui/material'
import PhotoCamera from '@mui/icons-material/PhotoCamera'
import Transition from '../ModalTransition'
import { LEVEL, SERVICE_ENDPOINT } from '@/app/constants'
import axios from 'axios'
import imageCompression from 'browser-image-compression'
import Image from 'next/image'
import AutocompletePlayer from './PlayerForm'
import { RootState } from '@/app/libs/redux/store'
import { useSelector } from '@/app/providers'
import { ContactMethod, Language, TournamentEvent } from '@/type'
import { useTranslation } from 'react-i18next'

interface Player {
  id?: string;
  officialName: string;
  officialNameEn?: string;
  pronunciation?: string;
  displayName: string;
  club: string;
  gender: string;
  photo: File | null;
  photoPreview?: string;
  inputValue?: string; // For dynamic option creation
  level: number;
}

interface ContactPerson {
  id: string,
  officialName: string,
  displayName: string,
  contact: {
    line?: string,
    tel: string,
    tg?: string,
    whatsapp?: string,
    email?: string,
    wechat?: string,
    facebook?: string,
  },
}

interface Props {
  events: TournamentEvent[],
    visible: boolean;
    setVisible: Dispatch<SetStateAction<boolean>>;
    tournamentLanguage: Language
}

export const initialPlayer: Player = {
  id: '',
  officialName: '',
  officialNameEn: '',
  pronunciation: '',
  displayName: '',
  club: '',
  gender: 'female',
  photo: null,
  photoPreview: '',
  inputValue: undefined,
  level: 0,
}


const RegisterEventForm = ({ events, visible, setVisible, tournamentLanguage }: Props) => {
  const user = useSelector((state: RootState) => state.app.user)
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [event, setEvent] = useState('')
  const [playerList, setPlayerList] = useState([])
  const [filteredPlayerList, setFilteredPlayerList] = useState<Player[]>([])
  const [player1, setPlayer1] = useState<Player>(initialPlayer)
  const [player2, setPlayer2] = useState<Player>(initialPlayer)
  const [contactPerson, setContactPerson] = useState<ContactPerson>({
    id: user?.player.id || '',
    officialName: '',
    displayName: '',
    contact: {
      tel: ''
    },
  })
  const [social, setSocial] = useState<ContactMethod>('line')

  useEffect(() => {
    const filterArray: string[] = []
    if(player1.id) {
      filterArray.push(player1.id)
    }
    if(player2.id) {
      filterArray.push(player2.id)
    }
    const newPlayerList: Player[] = playerList.filter((p: Player) => !filterArray.includes(p.id || ''))
    setFilteredPlayerList(newPlayerList)

  }, [player1, player2])

  useEffect(() => {
    const fetchPlayers = async() => {
      // Fetch players from API or any data source
      const players = await axios.get(`${SERVICE_ENDPOINT}/players`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPlayerList = players.data.map((p: any) => ({ ...p, officialName: p.officialName[language] || p.officialName['en'] }))
      setPlayerList(formattedPlayerList)
      setFilteredPlayerList(formattedPlayerList)
    }
    fetchPlayers()
  }, [])

  useEffect(() => {
    if(user){
      setContactPerson({
        id: user.player.id,
        officialName: user.player.officialName?.[language] || user.player.officialName?.['en'] || '',
        displayName:  user.player.displayName?.[language] || user.player.displayName?.['en'] || '',
        contact: {
          tel: user.player.contact?.tel || '',
          line: user.player.contact?.line || '',
        },
      })
    }
  }, [user, language])

  const handleCloseModal = () => {
    setVisible(false)
    setEvent('')
    setPlayer1(initialPlayer)
    setPlayer2(initialPlayer)
    setContactPerson({
      id: user?.player.id || '',
      officialName: user?.player.officialName?.[language] || '',
      displayName: user?.player.displayName?.[language] || '',
      contact: {
        tel: ''
      },
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlayerChange = async(player: 'player1' | 'player2', field: keyof Player, value: any) => {
    const setPlayer = player === 'player1' ? setPlayer1 : setPlayer2

    if(field === 'photo' && value) {
      const maxSize = 5 * 1024 * 1024
      if (value.size > maxSize) {
        console.log('File size exceeds 5MB')
        return
      }
      // Compress the image
      const compressedFile = await imageCompression(value, {
        maxSizeMB: 1, // aim to compress to around 1MB
        maxWidthOrHeight: 512, // keep reasonable dimensions
        useWebWorker: true,
      })

      const photoUrl = URL.createObjectURL(compressedFile)
      setPlayer((prev) => ({ ...prev, photoPreview: photoUrl }))

      const formData = new FormData()
      formData.append('image', compressedFile)

      value = formData

    }
    setPlayer((prev) => ({ ...prev, [field]: value }))
  }

  const handleContactChange = (field: keyof ContactPerson, value: unknown) => {
    setContactPerson((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault()
    // console.log({ event, player1, player2, contactPerson })
    const playersArray = []
    if(player1.officialName){
      playersArray.push({
        id: player1.id,
        officialName: {
          [language]: player1.officialName,
          en: player1.officialNameEn,
          pronunciation: player1.pronunciation,
        },
        displayName: {
          [language]: player1.displayName,
        },
        gender: player1.gender,
        club: player1.club,
        level: player1.level
      })
    }
    if(player2.officialName){
      playersArray.push({
        id: player2.id,
        officialName: {
          [language]: player2.officialName,
          en: player2.officialNameEn,
          pronunciation: player2.pronunciation,
        },
        displayName: {
          [language]: player2.displayName,
        },
        gender: player2.gender,
        club: player2.club,
        level:player2.level
      })
    }
    const registerPayload = {
      eventID: event,
      players: playersArray,
      contactPerson: {
        id: contactPerson.id,
        officialName: {
          [language]: player2.officialName,
          en: player2.officialName,
          pronunciation: player2.pronunciation,
        },
        displayName: {
          [language]: player2.displayName,
          en: player2.displayName,
        },
        contact: contactPerson.contact
      }
    }
    await axios.post(`${SERVICE_ENDPOINT}/events/register`, registerPayload, { withCredentials: true })
    handleCloseModal()
  }

  const handleMeCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target

    if (checked) {
      setPlayer1({
        id: user?.player.id || '',
        officialName: user?.player.officialName?.[language] || '',
        officialNameEn: user?.player.officialName?.['en'] || '',
        displayName: user?.player.displayName?.[language] || '',
        club: user?.player.club || '',
        pronunciation: user?.player.officialName.pronunciation || '',
        photoPreview: user?.player.photo || '',
        gender: user?.player.gender || 'female',
        photo: null,
        inputValue: '',
        level: user?.player.level || 0
      })
    } else {
      setPlayer1(initialPlayer)
    }
  }

  return (
    <Dialog
      data-testid="register-event-modal"
      open={visible}
      onClose={handleCloseModal}
      slots={{ transition: Transition }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ maxWidth: 500, minWidth: 300, mx: 'auto' }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {t('tournament.registration.title')}
        </DialogTitle>

        <DialogContent dividers>

          <FormControl fullWidth margin="normal">
            <InputLabel id="event-label">{t('tournament.registration.event')}</InputLabel>
            <Select
              required
              label="Event"
              labelId="event-label"
              value={event}
              onChange={(e) => setEvent(e.target.value)}>
              {events.map((event) => (
                <MenuItem key={event.id} value={event.id}>
                  {event.name[language] || event.name.en}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ pb:2, pt:2 }}>{`${t('tournament.registration.player')} 1`}</Divider>
          <FormControlLabel control={<Checkbox  onChange={handleMeCheckboxChange}/>} label={t('tournament.registration.me')} />
          <AutocompletePlayer
            label={t('tournament.registration.fullname')}
            playerValue={player1}
            player='player1'
            handlePlayerChange={handlePlayerChange}
            playerList={filteredPlayerList}
            setPlayer={setPlayer1}
          />
          {tournamentLanguage !== 'en' && language !== 'en' && (
            <TextField
              label={t('tournament.registration.fullnameEN')}
              value={player1.officialNameEn}
              onChange={(e) => handlePlayerChange('player1', 'officialNameEn', e.target.value)}
              fullWidth
              margin="normal"
            />
          )}

          <TextField
            label={t('tournament.registration.pronunciation')}
            value={player1.pronunciation}
            onChange={(e) => handlePlayerChange('player1', 'pronunciation', e.target.value)}
            fullWidth
            margin="normal"
          />

          <TextField
            label={t('tournament.registration.displayName')}
            value={player1.displayName}
            onChange={(e) => handlePlayerChange('player1', 'displayName', e.target.value)}
            fullWidth
            margin="normal"
          />

          <TextField
            label={t('tournament.registration.club')}
            value={player1.club}
            onChange={(e) => handlePlayerChange('player1', 'club', e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="level-label">{t('tournament.registration.level')}</InputLabel>
            <Select
              required
              label="Level"
              labelId="level-label"
              value={player1.level}
              onChange={(e) => handlePlayerChange('player1', 'level', e.target.value)}>
              {LEVEL.map((level, index) => (
                <MenuItem key={`level-${index}`} value={index}>
                  {level[language] || level.en}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <FormLabel>{t('tournament.registration.gender')}</FormLabel>
            <RadioGroup
              row
              defaultValue="male"
              name="radio-buttons-group"
              value={player1.gender}
              onChange={(e) => handlePlayerChange('player1', 'gender', e.target.value)}
            >
              <FormControlLabel value="female" control={<Radio />} label={t('tournament.registration.female')} />
              <FormControlLabel value="male" control={<Radio />} label={t('tournament.registration.male')} />
            </RadioGroup>
          </FormControl>
          {
            player1.photoPreview && (
              <Image
                width={100}
                height={100}
                src={player1.photoPreview}
                alt="Uploaded Preview"
                style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }}
              />
            )
          }
          <Button
            variant="contained"
            component="label"
            startIcon={<PhotoCamera />}
            fullWidth
            sx={{ marginTop: 2 }}
          >
            {t('tournament.registration.uploadPhoto')}
            <input
              type="file"
              hidden
              accept="image/*"
              id="upload-image"
              onChange={(e) =>
                handlePlayerChange('player1', 'photo', e.target.files ? e.target.files[0] : null)
              }
            />
          </Button>

          {
            events.find((e) => e.id === event)?.type === 'double' && (
              <>
                <Divider sx={{ pb:2, pt:2 }}>Player 2</Divider>
                <AutocompletePlayer
                  playerValue={player2}
                  player='player2'
                  handlePlayerChange={handlePlayerChange}
                  playerList={filteredPlayerList}
                  setPlayer={setPlayer2}
                  label={t('tournament.registration.fullname')}
                />

                {tournamentLanguage !== 'en' && language !== 'en' && (
                  <TextField
                    label={t('tournament.registration.fullnameEN')}
                    value={player2.officialNameEn}
                    onChange={(e) => handlePlayerChange('player2', 'officialNameEn', e.target.value)}
                    fullWidth
                    margin="normal"
                  />
                )}

                <TextField
                  label={t('tournament.registration.pronunciation')}
                  value={player2.pronunciation}
                  onChange={(e) => handlePlayerChange('player2', 'pronunciation', e.target.value)}
                  fullWidth
                  margin="normal"
                />

                <TextField
                  label={t('tournament.registration.displayName')}
                  value={player2.displayName}
                  onChange={(e) => handlePlayerChange('player2', 'displayName', e.target.value)}
                  fullWidth
                  margin="normal"
                />

                <TextField
                  label={t('tournament.registration.club')}
                  value={player2.club}
                  onChange={(e) => handlePlayerChange('player2', 'club', e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel id="level-label">{t('tournament.registration.level')}</InputLabel>
                  <Select
                    required
                    label="Level"
                    labelId="level-label"
                    value={player2.level}
                    onChange={(e) => handlePlayerChange('player2', 'level', e.target.value)}>
                    {LEVEL.map((level, index) => (
                      <MenuItem key={`level-${index}`} value={index}>
                        {level[language] || level.en}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <FormLabel>{t('tournament.registration.gender')}</FormLabel>
                  <RadioGroup
                    row
                    defaultValue="male"
                    name="radio-buttons-group"
                    value={player2.gender}
                    onChange={(e) => handlePlayerChange('player2', 'gender', e.target.value)}
                  >
                    <FormControlLabel value="female" control={<Radio />} label={t('tournament.registration.female')} />
                    <FormControlLabel value="male" control={<Radio />} label={t('tournament.registration.male')} />
                  </RadioGroup>
                </FormControl>
                {
                  player2.photoPreview && (
                    <Image
                      width={100}
                      height={100}
                      src={player2.photoPreview}
                      alt="Uploaded Preview"
                      style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }}
                    />
                  )
                }
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<PhotoCamera />}
                  fullWidth
                  sx={{ marginTop: 2 }}
                >
                  {t('tournament.registration.uploadPhoto')}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    id="upload-image"
                    onChange={(e) =>
                      handlePlayerChange('player2', 'photo', e.target.files ? e.target.files[0] : null)
                    }
                  />
                </Button>
              </>
            )
          }

          <Divider sx={{ pb:2, pt:2 }}>{t('tournament.registration.contactPerson')}</Divider>

          <Typography variant="subtitle1" component="div" sx={{ textAlign: 'center' }}>
            {contactPerson?.officialName || ''}
          </Typography>

          <TextField
            label={t('tournament.registration.tel')}
            value={contactPerson.contact.tel}
            onChange={(e) => handleContactChange('contact', { ...contactPerson.contact, tel: e.target.value })}
            fullWidth
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label={t('tournament.registration.socialMedia')}
            value={contactPerson?.contact[social] || ''}
            onChange={(e) => handleContactChange('contact', { ...contactPerson.contact, [social]: e.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <FormControl variant="standard">
                      <Select
                        value={social}
                        onChange={(e) => {
                          setSocial(e.target.value as ContactMethod)
                        }}
                        disableUnderline
                        variant="standard"
                      >
                        <MenuItem value="line">Line</MenuItem>
                        <MenuItem value="whatsapp">WhatsApp</MenuItem>
                        <MenuItem value="tg">Telegram</MenuItem>
                        <MenuItem value="facebook">Facebook</MenuItem>
                        <MenuItem value="wechat">WeChat</MenuItem>
                      </Select>
                    </FormControl>
                  </InputAdornment>
                ),
              }
            }}
          />


        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseModal}>
            {t('action.cancel')}
          </Button>
          <Button type="submit" variant="contained">
            {t('tournament.registration.registerConfirm')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default RegisterEventForm