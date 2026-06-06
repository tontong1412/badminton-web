'use client'
import { useEffect, useState } from 'react'
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { useSelector } from 'react-redux'
import { RootState } from '../../libs/redux/store'
import { useRouter } from 'next/navigation'
import Layout from '../../components/Layout'
import tournamentService from '../../services/tournaments'
import { Tournament, User } from '@/type'
import moment from 'moment'

interface TournamentFormState {
  nameTh: string
  nameEn: string
  shuttlecockFee: string
  paymentCode: string
  paymentName: string
  paymentBank: string
}

const defaultForm: TournamentFormState = {
  nameTh: '',
  nameEn: '',
  shuttlecockFee: '',
  paymentCode: '',
  paymentName: '',
  paymentBank: '',
}

// Mock data - in real app, this would come from a backend endpoint to list all tournaments
const useTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  // TODO: Replace with actual API call to get all tournaments
  useEffect(() => {
    // const loadTournaments = async () => {
    //   try {
    //     const data = await tournamentService.getAll()
    //     setTournaments(data)
    //   } catch {
    //     console.error('Failed to load tournaments')
    //   } finally {
    //     setLoading(false)
    //   }
    // }
    // loadTournaments()
    setLoading(false)
  }, [])

  return { tournaments, loading, setTournaments }
}

export default function AdminTournamentsPage() {
  const user = useSelector((state: RootState) => state.app.user) as (User & { role?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)
  const router = useRouter()

  const { tournaments, loading } = useTournaments()
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TournamentFormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (userReady && !user) router.push('/')
    else if (userReady && !isAdmin) router.push('/admin')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userReady, user, isAdmin])

  const openEdit = (tournament: Tournament) => {
    setEditingId(tournament.id)
    setForm({
      nameTh: tournament.name?.th || '',
      nameEn: tournament.name?.en || '',
      shuttlecockFee: tournament.shuttlecockFee?.toString() || '',
      paymentCode: tournament.payment?.code || '',
      paymentName: tournament.payment?.name || '',
      paymentBank: tournament.payment?.bank || '',
    })
    setDialogError(null)
    setDialogOpen(true)
  }

  const handleSave = async() => {
    setDialogError(null)
    if (!form.nameTh.trim() || !form.nameEn.trim()) {
      setDialogError('Tournament name in both languages is required.')
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        const updatePayload: Partial<Tournament> = {
          name: {
            th: form.nameTh,
            en: form.nameEn,
          },
          shuttlecockFee: form.shuttlecockFee ? parseFloat(form.shuttlecockFee) : undefined,
          payment: {
            code: form.paymentCode,
            name: form.paymentName,
            bank: form.paymentBank,
          },
        }
        await tournamentService.update(editingId, updatePayload)
      }
      setDialogOpen(false)
      // Reload tournaments
      // await load()
    } catch {
      setDialogError('Failed to save tournament. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return
    // TODO: Implement delete functionality
    alert('Delete functionality to be implemented')
  }

  if (!userReady || loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">Tournament Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Edit tournament details and settings
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {tournaments.length === 0 ? (
          <Alert severity="info">No tournaments available.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tournaments.map((tournament) => (
              <Card key={tournament.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {tournament.name?.th} / {tournament.name?.en}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        <Chip
                          icon={<CalendarTodayIcon />}
                          label={`${moment(tournament.startDate).format('DD MMM')} - ${moment(tournament.endDate).format('DD MMM YYYY')}`}
                          size="small"
                          variant="outlined"
                        />
                        {tournament.venue && (
                          <Chip
                            icon={<LocationOnIcon />}
                            label={tournament.venue.name?.th || tournament.venue.name?.en || 'Venue'}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, fontSize: '0.875rem' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Shuttlecock Fee</Typography>
                      <Typography variant="body2">{tournament.shuttlecockFee || 'N/A'} THB</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Typography variant="body2">{tournament.status}</Typography>
                    </Box>
                    {tournament.payment?.name && (
                      <>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                          <Typography variant="body2">{tournament.payment.name}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Bank</Typography>
                          <Typography variant="body2">{tournament.payment.bank}</Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </CardContent>

                <CardActions>
                  <IconButton size="small" title="Edit" onClick={() => openEdit(tournament)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" title="Delete" onClick={() => handleDelete(tournament.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Tournament Details</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Tournament Name (Thai) *"
                value={form.nameTh}
                onChange={(e) => setForm((f) => ({ ...f, nameTh: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Tournament Name (English) *"
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Shuttlecock Fee"
                type="number"
                value={form.shuttlecockFee}
                onChange={(e) => setForm((f) => ({ ...f, shuttlecockFee: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ step: '0.01', min: '0' }}
              />

              <Box>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Payment Information</Typography>
                <TextField
                  label="Payment Code"
                  value={form.paymentCode}
                  onChange={(e) => setForm((f) => ({ ...f, paymentCode: e.target.value }))}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="Payment Name"
                  value={form.paymentName}
                  onChange={(e) => setForm((f) => ({ ...f, paymentName: e.target.value }))}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="Payment Bank"
                  value={form.paymentBank}
                  onChange={(e) => setForm((f) => ({ ...f, paymentBank: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Box>

              {dialogError && <Alert severity="error">{dialogError}</Alert>}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}
