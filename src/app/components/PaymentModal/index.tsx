'use client'

import {
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Chip,
} from '@mui/material'
import { RootState } from '@/app/libs/redux/store'
import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react'
import Transition from '../ModalTransition'
import { useTranslation } from 'react-i18next'
import { Event, EventTeam, Language, PaymentStatus } from '@/type'
import { useSelector } from 'react-redux'
import { Check, CopyAll, PhotoCamera } from '@mui/icons-material'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import photoUtils from '@/app/libs/photo'
import axios from 'axios'
import { MAP_DECISION_STATUS, MAP_PAYMENT_STATUS, SERVICE_ENDPOINT } from '@/app/constants'

interface PaymentModalProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  team: EventTeam;
  setTeam: Dispatch<SetStateAction<EventTeam|null>>;
  event: Event;
  setEvent: Dispatch<SetStateAction<Event|undefined>> | ((event: Event)=>void);
  isManager: boolean;
}

interface UpdateTeamPayload {
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
  paymentStatus?: PaymentStatus;
}

const Detail = ({ title, content }: {title: string; content: string | ReactNode}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Box sx={{ fontWeight: 'bold', width: '100px' }}>{title}:</Box>
      <Box>{content}</Box>
    </Box>
  )

}


const PaymentModal = ({ visible, setVisible, event, team, setEvent, isManager, setTeam }: PaymentModalProps) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const [copyAlertOpen, setCopyAlertOpen] = useState(false)
  const [slipImage, setSlipImage] = useState<string | undefined>(team.slip)
  const [buttonLoading, setButtonLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    setSlipImage(team.slip)
  }, [visible])

  const uploadSlip = async(photo: unknown) => {
    const payload : UpdateTeamPayload = {
      eventID: event.id,
      teamID: team.id,
      field: 'slip',
      value: photo,
      paymentStatus: isManager ? PaymentStatus.Paid : PaymentStatus.Pending
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-team`, payload, { withCredentials: true })
    setEvent(response.data)
    setButtonLoading(false)
  }

  const updateTeam = async(teamID: string, field: string, value: unknown) => {
    const payload : UpdateTeamPayload = {
      eventID: event.id,
      teamID,
      field,
      value
    }
    const response = await axios.post(`${SERVICE_ENDPOINT}/events/update-team`, payload, { withCredentials: true })
    setEvent(response.data)
    const updatedTeam = response.data.teams.find((t: EventTeam) => t.id === team.id)
    setTeam(updatedTeam)
  }

  const handleUploadSlip = async(slip:File| null) => {
    setButtonLoading(true)
    if(!slip)return
    const maxSize = 5 * 1024 * 1024
    if (slip.size > maxSize) {
      alert('File size exceeds 5MB')
      return
    }
    // Compress the image
    const compressedFile = await imageCompression(slip, {
      maxSizeMB: 1, // aim to compress to around 1MB
      maxWidthOrHeight: 512, // keep reasonable dimensions
      useWebWorker: true,
    })

    const base64String = await photoUtils.toBase64(compressedFile)
    team.slip = base64String
    setSlipImage(base64String)

    await uploadSlip(base64String)
  }

  return (
    <Dialog
      fullWidth
      data-testid="payment-modal"
      open={visible}
      onClose={() => {
        setVisible(false)
        setSlipImage(undefined)
      }}
      slots={{ transition: Transition }}
    >

      <Box>
        <DialogTitle sx={{ m: 0, p: 2 }} id="contact-person-dialog-title">
          {t('tournament.registration.payment')}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight:'600px' }}>
          <Detail title='รายการ' content={event.name[language] || '-'}/>
          {
            team.players.map((p, idx) => (
              <Detail key={p.id} title={`ผู้เล่น ${idx + 1}`} content={p.officialName[language] || ''}/>
            ))
          }
          <Detail title='ผู้จัดการทีม' content={`${team.contactPerson.officialName[language]} (${team.contactPerson.displayName?.[language]})`}/>
          <Detail title='ค่าสมัคร' content={`${event.fee.amount} ${event.fee.currency}`} />
          <Detail title='ประเมินมือ' content={<Chip
            size='small'
            sx={{ marginRight: '3px' }}
            label={MAP_DECISION_STATUS[team.status][language]}
            variant='outlined'
            color={MAP_DECISION_STATUS[team.status].color} />}/>
          <Detail title='สถานะ' content={<Chip
            size='small'
            label={MAP_PAYMENT_STATUS[team.paymentStatus][language]}
            variant='outlined'
            color={MAP_PAYMENT_STATUS[team.paymentStatus].color} />}/>

          <Divider sx={{ pt: 2, pb: 2 }}>ช่องทางการชำระเงิน</Divider>

          <Detail title='ช่องทาง' content={event.tournament.payment.bank}/>
          <Detail title='เลขบัญชี' content={<div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{event.tournament.payment.code}
            <div onClick={() => {
              navigator.clipboard.writeText(event.tournament.payment.code).then(() => {
                setCopyAlertOpen(true)
                setTimeout(() => {
                  setCopyAlertOpen(false)
                }, 2000)
              })
            }}><CopyAll />
            </div>
          </div>}/>
          <Detail title='ชื่อบัญชี' content={event.tournament.payment.name}/>

          {copyAlertOpen && <Alert  icon={<Check fontSize="inherit" />} severity="success">
            Copied
          </Alert>}

          {slipImage && <div style={{ position: 'relative', width: 'auto', height: '300px' }}>
            <Image alt='payment-slip' src={slipImage} fill style={{ objectFit: 'contain' }}/>
          </div>}

          {isManager && <Box sx={{ display:'flex', justifyContent:'space-evenly', gap:1, mt:2 }}>
            <Button sx={{ width:'50%' }} variant='outlined' color='error' onClick={() => updateTeam(team.id, 'paymentStatus', PaymentStatus.Unpaid)}>
              {t('action.rejectPayment')}
            </Button>
            <Button sx={{ width:'50%' }} variant='outlined' color='success' onClick={() => updateTeam(team.id, 'paymentStatus', PaymentStatus.Paid)}>
              {t('action.approvePayment')}
            </Button>
          </Box>}

          <Button
            sx={{ mt:1 }}
            variant="contained"
            component="label"
            fullWidth
            loading={buttonLoading}
            startIcon={<PhotoCamera />}
          >
            {t('tournament.registration.uploadSlip')}
            <input
              type="file"
              hidden
              accept="image/*"
              id="upload-image"
              onChange={(e) =>
                handleUploadSlip(e.target.files ? e.target.files[0] : null)
              }
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button variant='contained' onClick={() => {
            setSlipImage(undefined)
            setVisible(false)
          }}>
            {t('action.close')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
export default PaymentModal
