'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useSelector } from 'react-redux'
import { RootState } from '../../libs/redux/store'
import { useRouter } from 'next/navigation'
import Layout from '../../components/Layout'
import bannerService from '../../services/banners'
import photoLib from '../../libs/photo'
import { Banner, User } from '@/type'

interface BannerFormState {
  title: string;
  linkUrl: string;
  isActive: boolean;
}

const defaultForm: BannerFormState = { title: '', linkUrl: '', isActive: true }

export default function AdminBannersPage() {
  const user = useSelector((state: RootState) => state.app.user) as (User & { role?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)
  const router = useRouter()

  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BannerFormState>(defaultForm)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = user?.role === 'admin'

  const load = async() => {
    try {
      setLoading(true)
      const data = await bannerService.getAll()
      setBanners(data)
    } catch {
      setError('Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userReady && !user) router.push('/')
    else if (userReady && !isAdmin) router.push('/admin')
    else if (userReady && isAdmin) void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userReady, user, isAdmin])

  const openCreate = () => {
    setEditingId(null)
    setForm(defaultForm)
    setImagePreview(null)
    setImageBase64(null)
    setDialogError(null)
    setDialogOpen(true)
  }

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id)
    setForm({ title: banner.title ?? '', linkUrl: banner.linkUrl ?? '', isActive: banner.isActive })
    setImagePreview(banner.imageUrl)
    setImageBase64(null)
    setDialogError(null)
    setDialogOpen(true)
  }

  const handleImageChange = async(e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const base64 = await photoLib.toBase64(file)
    setImagePreview(base64)
    setImageBase64(base64)
  }

  const handleSave = async() => {
    setDialogError(null)
    if (!editingId && !imageBase64) {
      setDialogError('Please select a banner image.')
      return
    }
    try {
      setSaving(true)
      if (editingId) {
        await bannerService.update(editingId, {
          title: form.title || undefined,
          linkUrl: form.linkUrl || undefined,
          isActive: form.isActive,
        })
      } else {
        await bannerService.create({
          title: form.title || undefined,
          image: imageBase64!,
          linkUrl: form.linkUrl || undefined,
          order: banners.length,
          isActive: form.isActive,
        })
      }
      setDialogOpen(false)
      await load()
    } catch {
      setDialogError('Failed to save banner. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async(id: string) => {
    if (!confirm('Delete this banner?')) return
    try {
      await bannerService.remove(id)
      await load()
    } catch {
      setError('Failed to delete banner.')
    }
  }

  const handleMoveOrder = async(index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= banners.length) return

    const updated = [...banners]
    ;[updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]]

    // Update orders
    try {
      await Promise.all([
        bannerService.update(updated[index].id, { order: index }),
        bannerService.update(updated[swapIndex].id, { order: swapIndex }),
      ])
      await load()
    } catch {
      setError('Failed to reorder banners.')
    }
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Banner Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage home page advertisement banners (3:1 desktop / 2:1 mobile)
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Banner
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {banners.length === 0 ? (
          <Alert severity="info">No banners yet. Add one to display on the home page.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {banners.map((banner, index) => (
              <Card key={banner.id ?? `banner-${index}`} variant="outlined" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 0 }}>
                {/* Thumbnail — 1:3 preview */}
                <Box
                  sx={{
                    width: { xs: '100%', sm: 240 },
                    aspectRatio: { xs: '2 / 1', sm: '3 / 1' },
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <CardMedia
                    component="img"
                    image={banner.imageUrl}
                    alt={banner.title ?? 'Banner'}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography fontWeight={600}>{banner.title || <em style={{ color: '#999' }}>No title</em>}</Typography>
                      <Chip
                        label={banner.isActive ? 'Active' : 'Inactive'}
                        color={banner.isActive ? 'success' : 'default'}
                        size="small"
                      />
                      <Chip label={`Order: ${banner.order}`} size="small" variant="outlined" />
                    </Box>
                    {banner.linkUrl && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Link: {banner.linkUrl}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ mt: 'auto', gap: 0.5, flexWrap: 'wrap' }}>
                    <IconButton size="small" title="Move up" onClick={() => void handleMoveOrder(index, 'up')} disabled={index === 0}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" title="Move down" onClick={() => void handleMoveOrder(index, 'down')} disabled={index === banners.length - 1}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" title="Edit" onClick={() => openEdit(banner)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" title="Delete" onClick={() => void handleDelete(banner.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Box>
              </Card>
            ))}
          </Box>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingId ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {/* Image picker */}
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => void handleImageChange(e)}
                />
                <Button variant="outlined" onClick={() => fileInputRef.current?.click()} size="small">
                  {editingId ? 'Replace Image' : 'Choose Image *'}
                </Button>
                {imagePreview && (
                  <Box
                    sx={{
                      mt: 1.5,
                      width: '100%',
                      aspectRatio: { xs: '2 / 1', sm: '3 / 1' },
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Preview"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Recommended ratio: 3:1 desktop / 2:1 mobile (e.g. 1200×400 px)
                </Typography>
              </Box>

              <TextField
                label="Title (optional)"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Link URL (optional)"
                value={form.linkUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                fullWidth
                size="small"
                placeholder="https://..."
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                }
                label="Active (visible on home page)"
              />
              {dialogError && <Alert severity="error">{dialogError}</Alert>}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <CircularProgress size={18} /> : editingId ? 'Save' : 'Add Banner'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}
