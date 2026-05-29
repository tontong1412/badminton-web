'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
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
import moment from 'moment'
import axios from 'axios'
import QRCode from 'react-qr-code'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatePayload = require('promptpay-qr') as (id: string, options?: { amount?: number }) => string
import Layout from '../components/Layout'
import bookingsService from '../services/bookings'
import { Booking, BookingStatus, Court, Venue } from '@/type'

function GuestPayContent() {
  const searchParams = useSearchParams()
  const bundleID = searchParams.get('bundleID')
  const guestEmail = searchParams.get('email')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [venue, setVenue] = useState<Venue | null>(null)
  const [court, setCourt] = useState<Court | null>(null)

  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [slipNote, setSlipNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const loadBundle = useCallback(async() => {
    if (!bundleID || !guestEmail) {
      setError('Invalid payment link. Please check your email for the correct link.')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await bookingsService.getBundle(bundleID, guestEmail)
      setBookings(data.bookings)
      setVenue(data.venue)
      setCourt(data.court)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message
        setError(msg ?? 'Failed to load booking details.')
      } else {
        setError('Failed to load booking details.')
      }
    } finally {
      setLoading(false)
    }
  }, [bundleID, guestEmail])

  useEffect(() => {
    loadBundle()
  }, [loadBundle])

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
    if (!bundleID || !guestEmail || !slipPreview) return
    try {
      setSubmitting(true)
      setSubmitError(null)
      await bookingsService.payBooking(bundleID, { slip: slipPreview, note: slipNote || undefined }, guestEmail)
      setSuccess(true)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message
        setSubmitError(msg ?? 'Failed to submit payment. Please try again.')
      } else {
        setSubmitError('Failed to submit payment. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalPrice = bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0)
  const currency = bookings[0]?.currency ?? ''
  const bookingRef = bookings[0]?.bookingRef
  const isCancelled = bookings.some((b) => b.status === BookingStatus.Cancelled)

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
            Payment Submitted!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your payment slip has been submitted successfully. The venue will verify it shortly.
          </Typography>
          {bookingRef && (
            <Typography variant="body2" sx={{ mt: 2, fontFamily: 'monospace', fontWeight: 700 }}>
              Booking ref: #{bookingRef}
            </Typography>
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
            Complete Payment
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
            Booking Details
          </Typography>
          {venue && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Venue:</strong> {venue.name?.en || venue.name?.th}
            </Typography>
          )}
          {bookings.map((b) => (
            <Box key={b.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
              <Typography variant="body2">
                {court?.name ?? '—'} &nbsp;·&nbsp; {moment(b.date).format('DD/MM/YYYY')} &nbsp;·&nbsp; {b.startTime}–{b.endTime}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, ml: 2, whiteSpace: 'nowrap' }}>
                {(Number(b.totalPrice) || 0).toFixed(2)} {b.currency}
              </Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">Total</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {totalPrice.toFixed(2)} {currency}
            </Typography>
          </Box>
        </Box>

        {/* Payment info */}
        {venue?.payment ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Payment Method
            </Typography>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                {venue.payment.bankName && (
                  <Typography variant="body2">
                    <strong>Bank:</strong> {venue.payment.bankName}
                  </Typography>
                )}
                {venue.payment.accountName && (
                  <Typography variant="body2">
                    <strong>Account Name:</strong> {venue.payment.accountName}
                  </Typography>
                )}
                {venue.payment.accountNumber && (
                  <Typography variant="body2">
                    <strong>Account Number:</strong> {venue.payment.accountNumber}
                  </Typography>
                )}
                {venue.payment.promptPayID && (
                  <Typography variant="body2">
                    <strong>PromptPay ID:</strong> {venue.payment.promptPayID}
                  </Typography>
                )}
              </Box>
              {venue.payment.promptPayID && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 2, flexShrink: 0 }}>
                  <QRCode
                    value={generatePayload(venue.payment.promptPayID, { amount: totalPrice })}
                    size={80}
                    style={{ borderRadius: 4, border: '1px solid #e0e0e0', padding: 4, background: 'white' }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 600, color: 'text.secondary' }}>
                    Scan to Pay
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ) : null}

        <Divider sx={{ mb: 2 }} />

        {isCancelled ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            This booking has been cancelled. Payment is no longer accepted.
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Transfer the amount above and upload your payment slip to confirm the booking.
            </Typography>

            <Button
              variant="contained"
              component="label"
              fullWidth
              sx={{ mb: 2 }}
            >
              {slipFile ? `Selected: ${slipFile.name}` : 'Choose Payment Slip'}
              <input type="file" accept="image/*" hidden onChange={handleSlipFileChange} />
            </Button>

            {slipPreview && (
              <img
                src={slipPreview}
                alt="slip preview"
                style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 4, marginBottom: 12 }}
              />
            )}

            <TextField
              size="small"
              fullWidth
              label="Note (optional)"
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
              variant="contained"
              fullWidth
              size="large"
              disabled={!slipPreview || submitting}
              onClick={handleSubmit}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Payment'}
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
