'use client'

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  Typography,
  FormControlLabel,
  Switch,
  Paper,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tournament, TournamentStatus } from '@/type'
import { TournamentResponse } from '@/app/libs/data'
import tournamentService from '@/app/services/tournaments'
import moment from 'moment'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { Moment } from 'moment'

interface TournamentDetailsProps {
  tournament: Tournament
  isManager: boolean
  setTournament: TournamentResponse['mutate']
}

const TournamentDetails = ({ tournament, isManager, setTournament }: TournamentDetailsProps) => {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nameTh: tournament.name?.th || '',
    nameEn: tournament.name?.en || '',
    startDate: moment(tournament.startDate),
    endDate: moment(tournament.endDate),
    shuttlecockFee: tournament.shuttlecockFee?.toString() || '',
    useHandicap: tournament.useHandicap || false,
    showParticipantList: tournament.showParticipantList || true,
    status: tournament.status || TournamentStatus.Preparation,
    paymentCode: tournament.payment?.code || '',
    paymentName: tournament.payment?.name || '',
    paymentBank: tournament.payment?.bank || '',
  })

  const handleChange = (field: string, value: string | boolean | Moment) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async() => {
    setError(null)
    setSuccess(null)

    if (!formData.nameTh.trim() || !formData.nameEn.trim()) {
      setError(t('tournament.details.error.nameRequired'))
      return
    }

    try {
      setSaving(true)
      const updatePayload: Partial<Tournament> = {
        name: {
          th: formData.nameTh,
          en: formData.nameEn,
        },
        startDate: formData.startDate.toDate().toISOString(),
        endDate: formData.endDate.toDate().toISOString(),
        shuttlecockFee: formData.shuttlecockFee ? parseFloat(formData.shuttlecockFee) : undefined,
        useHandicap: formData.useHandicap,
        showParticipantList: formData.showParticipantList,
        status: formData.status,
        payment: {
          code: formData.paymentCode,
          name: formData.paymentName,
          bank: formData.paymentBank,
        },
      }

      await tournamentService.update(tournament.id, updatePayload)
      setSuccess(t('tournament.details.success.saved'))
      setIsEditing(false)
      // Refresh tournament data
      await setTournament()
    } catch {
      setError(t('tournament.details.error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      nameTh: tournament.name?.th || '',
      nameEn: tournament.name?.en || '',
      startDate: moment(tournament.startDate),
      endDate: moment(tournament.endDate),
      shuttlecockFee: tournament.shuttlecockFee?.toString() || '',
      useHandicap: tournament.useHandicap || false,
      showParticipantList: tournament.showParticipantList || true,
      status: tournament.status || TournamentStatus.Preparation,
      paymentCode: tournament.payment?.code || '',
      paymentName: tournament.payment?.name || '',
      paymentBank: tournament.payment?.bank || '',
    })
    setIsEditing(false)
    setError(null)
  }

  if (!tournament) {
    return <CircularProgress />
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        รายละเอียดทัวร์นาเมนต์
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Tournament Info Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              ข้อมูลทัวร์นาเมนต์
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ชื่อทัวร์นาเมนต์ (ไทย) *"
                  value={formData.nameTh}
                  onChange={(e) => handleChange('nameTh', e.target.value)}
                  fullWidth
                  disabled={!isEditing}
                  size="small"
                  variant={isEditing ? 'outlined' : 'standard'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Tournament Name (English) *"
                  value={formData.nameEn}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  fullWidth
                  disabled={!isEditing}
                  size="small"
                  variant={isEditing ? 'outlined' : 'standard'}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                {isEditing ? (
                  <LocalizationProvider dateAdapter={AdapterMoment}>
                    <DatePicker
                      label="วันเริ่มต้น"
                      value={formData.startDate}
                      onChange={(date) => handleChange('startDate', date || moment())}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </LocalizationProvider>
                ) : (
                  <TextField
                    label="วันเริ่มต้น"
                    type="text"
                    value={moment(tournament.startDate).format('DD/MM/YYYY')}
                    disabled
                    fullWidth
                    size="small"
                    variant="standard"
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                {isEditing ? (
                  <LocalizationProvider dateAdapter={AdapterMoment}>
                    <DatePicker
                      label="วันสิ้นสุด"
                      value={formData.endDate}
                      onChange={(date) => handleChange('endDate', date || moment())}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </LocalizationProvider>
                ) : (
                  <TextField
                    label="วันสิ้นสุด"
                    type="text"
                    value={moment(tournament.endDate).format('DD/MM/YYYY')}
                    disabled
                    fullWidth
                    size="small"
                    variant="standard"
                  />
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="สถานที่แข่ง"
                  value={tournament.venue?.name?.th || tournament.venue?.name?.en || ''}
                  disabled
                  fullWidth
                  size="small"
                  variant="standard"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                {isEditing ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>สถานะ</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      label="สถานะ"
                    >
                      <MenuItem value={TournamentStatus.Preparation}>Preparation</MenuItem>
                      <MenuItem value={TournamentStatus.RegistrationOpen}>Registration Open</MenuItem>
                      <MenuItem value={TournamentStatus.RegistrationClose}>Registration Close</MenuItem>
                      <MenuItem value={TournamentStatus.SchedulePublished}>Schedule Published</MenuItem>
                      <MenuItem value={TournamentStatus.Ongoing}>Ongoing</MenuItem>
                      <MenuItem value={TournamentStatus.Finished}>Finished</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    label="สถานะ"
                    value={tournament.status || ''}
                    disabled
                    fullWidth
                    size="small"
                    variant="standard"
                  />
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Fees & Settings Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              ค่าใช้งาน & การตั้งค่า
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ค่าแบดมินตันต่อการแข่ง"
                  type="number"
                  value={formData.shuttlecockFee}
                  onChange={(e) => handleChange('shuttlecockFee', e.target.value)}
                  fullWidth
                  disabled={!isEditing}
                  size="small"
                  inputProps={{ step: '0.01', min: '0' }}
                  variant={isEditing ? 'outlined' : 'standard'}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useHandicap}
                        onChange={(e) => handleChange('useHandicap', e.target.checked)}
                        disabled={!isEditing}
                      />
                    }
                    label="ใช้ระบบแฮนดิแคป"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.showParticipantList}
                        onChange={(e) => handleChange('showParticipantList', e.target.checked)}
                        disabled={!isEditing}
                      />
                    }
                    label="แสดงรายชื่อผู้เข้าร่วม"
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payment Info Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              ข้อมูลการชำระเงิน
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="รหัสชำระเงิน"
                  value={formData.paymentCode}
                  onChange={(e) => handleChange('paymentCode', e.target.value)}
                  fullWidth
                  disabled={!isEditing}
                  size="small"
                  variant={isEditing ? 'outlined' : 'standard'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ชื่อผู้รับชำระเงิน"
                  value={formData.paymentName}
                  onChange={(e) => handleChange('paymentName', e.target.value)}
                  fullWidth
                  disabled={!isEditing}
                  size="small"
                  variant={isEditing ? 'outlined' : 'standard'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="ธนาคาร"
                  value={formData.paymentBank}
                  onChange={(e) => handleChange('paymentBank', e.target.value)}
                  fullWidth
                  disabled={!isEditing}
                  size="small"
                  variant={isEditing ? 'outlined' : 'standard'}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Paper sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {!isEditing ? (
            <Button
              variant="contained"
              onClick={() => setIsEditing(true)}
              disabled={!isManager}
            >
              แก้ไข
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={saving}
              >
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <CircularProgress size={18} /> : 'บันทึก'}
              </Button>
            </>
          )}
        </Paper>

        {!isManager && (
          <Alert severity="info">
            คุณไม่ใช่ผู้จัดการของทัวร์นาเมนต์นี้ จึงไม่สามารถแก้ไขข้อมูลได้
          </Alert>
        )}
      </Stack>
    </Box>
  )
}

export default TournamentDetails
