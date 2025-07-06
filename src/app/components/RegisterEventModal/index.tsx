import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
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
import photoUtils from '@/app/libs/photo'

export interface Player {
  id?: string;
  officialName: string;
  officialNameEn?: string;
  pronunciation?: string;
  displayName: string;
  club: string;
  gender: string;
  photo?: string;
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
  photo: undefined,
  photoPreview: '',
  inputValue: undefined,
  level: 0,
}


const RegisterEventForm = ({ events, visible, setVisible, tournamentLanguage }: Props) => {
  const user = useSelector((state: RootState) => state.app.user)
  const player1UploadRef = useRef<HTMLInputElement>(null)
  const player2UploadRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [buttonLoading, setButtonLoading] = useState(false)
  const [event, setEvent] = useState('')
  const [playerList, setPlayerList] = useState([])
  const [filteredPlayerList, setFilteredPlayerList] = useState<Player[]>([])
  const [player1, setPlayer1] = useState<Player>(initialPlayer)
  const [player2, setPlayer2] = useState<Player>(initialPlayer)
  const [lockOfficialNameWhenUseMeCheckBox, setLockOfficialNameWhenUseMeCheckBox] = useState(false)
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
      const formattedPlayerList = players.data.map((p: any) => ({
        ...p,
        officialName: p.officialName[language] || p.officialName['en'],
        displayName: p.displayName[language] || p.displayName['en'],
        officialNameEn: p.officialName['en'],
        pronunciation: p.officialName.pronunciation || '',
      }))
      setPlayerList(formattedPlayerList)
      setFilteredPlayerList(formattedPlayerList)
    }
    fetchPlayers()
  }, [language])

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
      officialName: '',
      displayName: '',
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
        alert('File size exceeds 5MB')
        return
      }
      // Compress the image
      const compressedFile = await imageCompression(value, {
        maxSizeMB: 1, // aim to compress to around 1MB
        maxWidthOrHeight: 512, // keep reasonable dimensions
        useWebWorker: true,
      })

      // generate preview URL
      const photoUrl = URL.createObjectURL(compressedFile)
      setPlayer((prev) => ({ ...prev, photoPreview: photoUrl }))

      const base64String = await photoUtils.toBase64(compressedFile)
      value = base64String
    }
    setPlayer((prev) => ({ ...prev, [field]: value }))
  }

  const handleContactChange = (field: keyof ContactPerson, value: unknown) => {
    setContactPerson((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault()
    if(!player1.photoPreview){
      player1UploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if(!player2.photoPreview){
      player2UploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setButtonLoading(true)

    try{
      const playersArray = []
      if(player1.officialName){
        playersArray.push({
          id: player1.id === 'none' ? undefined : player1.id,
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
          level: player1.level,
          photo: player1.photo,
        })
      }
      if(player2.officialName){
        playersArray.push({
          id: player2.id === 'none' ? undefined : player2.id,
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
          level:player2.level,
          photo: player2.photo,
        })
      }
      const registerPayload = {
        eventID: event,
        players: playersArray,
        contactPerson: {
          id: contactPerson.id,
          officialName: {
            [language]: user?.player.officialName[language],
            en: user?.player.officialName.en,
            pronunciation: user?.player.officialName.pronunciation,
          },
          displayName: {
            [language]: user?.player.displayName[language],
            en: user?.player.displayName.en,
          },
          contact: contactPerson.contact
        }
      }
      await axios.post(`${SERVICE_ENDPOINT}/events/register`, registerPayload, { withCredentials: true })
      handleCloseModal()
      setButtonLoading(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }catch(err: any){
      if(err.response.status === 409){
        alert(err.response.data.message)
        handleCloseModal()
      }
      setButtonLoading(false)
    }
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
        photo: undefined,
        inputValue: '',
        level: user?.player.level || 0
      })
      setLockOfficialNameWhenUseMeCheckBox(true)
    } else {
      setPlayer1(initialPlayer)
      setLockOfficialNameWhenUseMeCheckBox(false)
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
            disabled={lockOfficialNameWhenUseMeCheckBox}
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
                loading='lazy'
                width={100}
                height={100}
                src={player1.photoPreview}
                alt="Uploaded Preview"
                style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }}
              />
            )
          }
          {
            !player1.photoPreview && (
              <Typography color="error" variant="caption">
                Photo is required.
              </Typography>
            )
          }
          <div ref={player1UploadRef}>
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
          </div>

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
                  disabled={false}
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
                      loading='lazy'
                    />
                  )
                }

                {
                  !player2.photoPreview && (
                    <Typography color="error" variant="caption">
                      Photo is required.
                    </Typography>
                  )
                }
                <div ref={player2UploadRef}>
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
                </div>
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
          <Button type="submit" variant="contained" loading={buttonLoading} disabled={buttonLoading}>
            {t('tournament.registration.registerConfirm')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default RegisterEventForm