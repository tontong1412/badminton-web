'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import axios from 'axios'
import QRCode from 'react-qr-code'
import { useTranslation } from 'react-i18next'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatePayload = require('promptpay-qr') as (id: string, options?: { amount?: number }) => string
import Layout from '../components/Layout'
import bookingsService from '../services/bookings'
import { Booking, BookingStatus, Court, Venue } from '@/type'

function GuestPayContent() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bundleID = searchParams.get('bundleID')
  const guestEmail = searchParams.get('email')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [venue, setVenue] = useState<Venue | null>(null)
  const [courtsByID, setCourtsByID] = useState<Record<string, Court>>({})
  const [court, setCourt] = useState<Court | null>(null)

  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [slipNote, setSlipNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)

  const loadBundle = useCallback(async() => {
    if (!bundleID) {
      setError(t('booking.payPage.errors.invalidPaymentLink'))
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await bookingsService.getBundle(bundleID, guestEmail ?? undefined)
      setBookings(data.bookings)
      setVenue(data.venue)
      setCourt(data.court)
      const courtMap: Record<string, Court> = {}
      for (const courtItem of data.courts ?? []) {
        courtMap[courtItem.id] = courtItem
      }
      if (data.court) {
        courtMap[data.court.id] = data.court
      }
      setCourtsByID(courtMap)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError(t('booking.payPage.errors.unauthorizedPaymentPage'))
        } else {
          setError(msg ?? t('booking.payPage.errors.loadBookingDetailsFailed'))
        }
      } else {
        setError(t('booking.payPage.errors.loadBookingDetailsFailed'))
      }
    } finally {
      setLoading(false)
    }
  }, [bundleID, guestEmail, t])

  useEffect(() => {
    loadBundle()
  }, [loadBundle])

  useEffect(() => {
    if (!slipPreview || submitting) return
    submitButtonRef.current?.focus()
  }, [slipPreview, submitting])

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSlipFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setSlipPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setSlipPreview(null)
    }
  }

  const handleSubmit = async() => {
    if (!bundleID || !slipPreview) return
    try {
      setSubmitting(true)
      setSubmitError(null)
      await bookingsService.payBooking(bundleID, { slip: slipPreview, note: slipNote || undefined }, guestEmail ?? undefined)
      setSuccess(true)
    } catch (err) {
      let originalMessage: string | null = null
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | string
          | { message?: string; error?: string; detail?: string }
          | undefined
        if (typeof data === 'string' && data.trim()) {
          originalMessage = data.trim()
        } else if (data && typeof data === 'object') {
          originalMessage = data.message ?? data.error ?? data.detail ?? null
        }
      }

      const fallbackMessage = t('booking.payPage.errors.submitPaymentFailed')
      const contactVenueMessage = t('booking.payPage.errors.contactVenueIfNecessary')
      setSubmitError([originalMessage ?? fallbackMessage, contactVenueMessage].join(' '))
    } finally {
      setSubmitting(false)
    }
  }

  const totalPrice = bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0)
  const currency = bookings[0]?.currency ?? ''
  const bookingRef = bookings[0]?.bookingRef
  const isThaiLocale = (i18n.resolvedLanguage ?? i18n.language ?? 'en').startsWith('th')
  const bookingDateLocale = isThaiLocale ? 'th-TH' : 'en-US'
  const formatBookingDate = (date: string) => {
    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) return date
    return new Intl.DateTimeFormat(bookingDateLocale, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(parsedDate)
  }
  const isCancelled = bookings.some((b) => b.status === BookingStatus.Cancelled)
  const isResalePay = bookings.some((b) => Boolean(b.resaleSourceListingID))
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCmp !== 0) return dateCmp

      const courtNameA = courtsByID[a.courtID]?.name ?? court?.name ?? ''
      const courtNameB = courtsByID[b.courtID]?.name ?? court?.name ?? ''
      const courtCmp = courtNameA.localeCompare(courtNameB, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      if (courtCmp !== 0) return courtCmp

      const startCmp = a.startTime.localeCompare(b.startTime)
      if (startCmp !== 0) return startCmp

      return a.endTime.localeCompare(b.endTime)
    })
  }, [bookings, courtsByID, court?.name])
  const systemPromptPayID = process.env.NEXT_PUBLIC_SYSTEM_PROMPT_PAY_ID
  const systemBankName = process.env.NEXT_PUBLIC_SYSTEM_BANK_NAME
  const systemAccountName = process.env.NEXT_PUBLIC_SYSTEM_ACCOUNT_NAME
  const systemAccountNumber = process.env.NEXT_PUBLIC_SYSTEM_ACCOUNT_NUMBER

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            {t('booking.payPage.success.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('booking.payPage.success.description')}
          </Typography>
          {bookingRef && (
            <Typography variant="body2" sx={{ mt: 2, fontFamily: 'monospace', fontWeight: 700 }}>
              {t('booking.payPage.bookingRef')}: #{bookingRef}
            </Typography>
          )}
          {guestEmail ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              {t('booking.payPage.success.guestCheckEmail')}
            </Typography>
          ) : (
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => router.push('/bookings')}
            >
              {t('booking.payPage.success.goToMyBookings')}
            </Button>
          )}
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            {t('booking.payPage.title')}
          </Typography>
          {bookingRef && (
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 700, letterSpacing: 1 }}
            >
              #{bookingRef}
            </Typography>
          )}
        </Box>

        {/* Booking summary */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            {t('booking.payPage.bookingDetails')}
          </Typography>
          {venue && (
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, lineHeight: 1.25 }}>
              {venue.name?.en || venue.name?.th}
            </Typography>
          )}
          {sortedBookings.map((b, index) => {
            const bookingCourt = courtsByID[b.courtID]
            const bookingCourtName = bookingCourt?.name ?? court?.name ?? '—'
            const currentDayKey = new Date(b.date).toDateString()
            const previousDayKey = index > 0 ? new Date(sortedBookings[index - 1].date).toDateString() : ''
            const showDayDivider = index === 0 || currentDayKey !== previousDayKey
            return (
              <Box key={b.id}>
                {showDayDivider && (
                  <Box sx={{ mt: index === 0 ? 0.5 : 1.5, mb: 0.5 }}>
                    <Divider sx={{ mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      {formatBookingDate(b.date)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                  <Typography variant="body2">
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      {bookingCourtName} &nbsp;·&nbsp; {b.startTime}–{b.endTime}
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      {bookingCourtName}
                      <br />
                      {b.startTime}–{b.endTime}
                    </Box>
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, ml: 2, whiteSpace: 'nowrap' }}>
                    {(Number(b.totalPrice) || 0).toFixed(2)} {b.currency}
                  </Typography>
                </Box>
                {(b.selectedAddOns?.length ?? 0) > 0 && (
                  <Box sx={{ pl: 0.5, pb: 0.5 }}>
                    {b.selectedAddOns?.map((addOn) => (
                      <Typography key={`${b.id}-${addOn.id}`} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        + {addOn.name} ({addOn.price.toFixed(2)} {b.currency}){addOn.details ? ` — ${addOn.details}` : ''}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )
          })}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">{t('booking.total')}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {totalPrice.toFixed(2)} {currency}
            </Typography>
          </Box>
        </Box>

        {/* Payment info */}
        {isResalePay ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              {t('booking.paymentMethod')}
            </Typography>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                {systemBankName && (
                  <Typography variant="body2">
                    <strong>{t('booking.bankName')}:</strong> {systemBankName}
                  </Typography>
                )}
                {systemAccountName && (
                  <Typography variant="body2">
                    <strong>{t('booking.accountName')}:</strong> {systemAccountName}
                  </Typography>
                )}
                {systemAccountNumber && (
                  <Typography variant="body2">
                    <strong>{t('booking.accountNumber')}:</strong> {systemAccountNumber}
                  </Typography>
                )}
                {systemPromptPayID && (
                  <Typography variant="body2">
                    <strong>{t('booking.promptPayID')}:</strong> {systemPromptPayID}
                  </Typography>
                )}
              </Box>
              {systemPromptPayID && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: '100%', maxWidth: 300, border: 1, borderColor: 'divider', borderRadius: '14px 14px 0 0', overflow: 'hidden', bgcolor: 'white' }}>
                    <Image
                      src="/thai-qr-payment.webp"
                      alt={t('booking.payPage.thaiQrPaymentFrameAlt')}
                      width={640}
                      height={239}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                    <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
                      <QRCode
                        value={generatePayload(systemPromptPayID, { amount: totalPrice })}
                        size={220}
                        style={{ width: '100%', maxWidth: 220, height: 'auto', display: 'block' }}
                      />
                    </Box>
                    {systemAccountName && (
                      <Typography variant="h6" sx={{ textAlign: 'center' }}>
                        {systemAccountName}
                      </Typography>
                    )}
                  </Box>

                </Box>
              )}
            </Box>
          </Box>
        ) : venue?.payment ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              {t('booking.paymentMethod')}
            </Typography>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                {venue.payment.bankName && (
                  <Typography variant="body2">
                    <strong>{t('booking.bankName')}:</strong> {venue.payment.bankName}
                  </Typography>
                )}
                {venue.payment.accountName && (
                  <Typography variant="body2">
                    <strong>{t('booking.accountName')}:</strong> {venue.payment.accountName}
                  </Typography>
                )}
                {venue.payment.accountNumber && (
                  <Typography variant="body2">
                    <strong>{t('booking.accountNumber')}:</strong> {venue.payment.accountNumber}
                  </Typography>
                )}
                {venue.payment.promptPayID && (
                  <Typography variant="body2">
                    <strong>{t('booking.promptPayID')}:</strong> {venue.payment.promptPayID}
                  </Typography>
                )}
              </Box>
              {venue.payment.promptPayID && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ pb:2, width: '100%', maxWidth: 300, border: 1, borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', bgcolor: 'white' }}>
                    <Image
                      src="/thai-qr-payment.webp"
                      alt={t('booking.payPage.thaiQrPaymentFrameAlt')}
                      width={640}
                      height={239}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                    <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
                      <QRCode
                        value={generatePayload(venue.payment.promptPayID, { amount: totalPrice })}
                        size={220}
                        style={{ width: '100%', maxWidth: 220, height: 'auto', display: 'block' }}
                      />
                    </Box>
                    {venue.payment.accountName && (
                      <Typography variant="h6" sx={{ textAlign: 'center' }}>
                        {venue.payment.accountName}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        ) : null}

        <Divider sx={{ mb: 2 }} />

        {isCancelled ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('booking.payPage.bookingCancelled')}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {t('booking.payPage.transferInstruction')}
            </Typography>

            <Button
              variant="contained"
              component="label"
              fullWidth
              sx={{ mb: 2 }}
            >
              {slipFile ? t('booking.payPage.selectedSlip', { fileName: slipFile.name }) : t('booking.uploadSlip')}
              <input type="file" accept="image/*" hidden onChange={handleSlipFileChange} />
            </Button>

            {slipPreview && (
              <img
                src={slipPreview}
                alt={t('booking.payPage.slipPreviewAlt')}
                style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 4, marginBottom: 12 }}
              />
            )}

            <TextField
              size="small"
              fullWidth
              label={t('booking.payPage.noteOptional')}
              value={slipNote}
              onChange={(e) => setSlipNote(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>
            )}

            <Button
              ref={submitButtonRef}
              variant="contained"
              fullWidth
              size="large"
              disabled={!slipPreview || submitting}
              onClick={handleSubmit}
              sx={
                slipPreview && !submitting
                  ? {
                    '@keyframes submitGlowPulse': {
                      '0%': {
                        boxShadow: '0 0 0 0 rgba(128, 100, 79, 0.6)',
                      },
                      '70%': {
                        boxShadow: '0 0 0 8px rgba(128, 100, 79, 0)',
                      },
                      '100%': {
                        boxShadow: '0 0 0 0 rgba(128, 100, 79, 0)',
                      },
                    },
                    boxShadow: '0 0 0 2px rgba(128, 100, 79, 0.5)',
                    animation: 'submitGlowPulse 1.4s ease-in-out infinite',
                    '&:hover': {
                      boxShadow: '0 0 0 2px rgba(128, 100, 79, 0.7)',
                    },
                    '&:focus-visible': {
                      outline: '2px solid rgba(128, 100, 79, 0.8)',
                      outlineOffset: 2,
                    },
                  }
                  : undefined
              }
            >
              {submitting ? <CircularProgress size={24} /> : t('booking.payPage.submitPayment')}
            </Button>
          </>
        )}
      </Paper>
    </Container>
  )
}

export default function GuestPayPage() {
  return (
    <Layout>
      <Suspense fallback={
        <Container maxWidth="sm" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      }>
        <GuestPayContent />
      </Suspense>
    </Layout>
  )
}
