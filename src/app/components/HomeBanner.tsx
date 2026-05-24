'use client'
import { Banner } from '@/type'
import { Box, Skeleton } from '@mui/material'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import bannerService from '../services/banners'

const AUTO_PLAY_INTERVAL = 4000

const HomeBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    bannerService.getActive()
      .then(setBanners)
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [])

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length)
  }, [banners.length])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + banners.length) % banners.length)
  }, [banners.length])

  // Auto-play
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, AUTO_PLAY_INTERVAL)
    return () => clearInterval(timer)
  }, [banners.length, next])

  if (loading) {
    return (
      <Box sx={{ width: '100%', aspectRatio: { xs: '2 / 1', sm: '3 / 1' }, borderRadius: 2, overflow: 'hidden', mb: 3, mt: { xs: 2, sm: 0 } }}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
    )
  }

  if (banners.length === 0) return null

  return (
    <Box sx={{ width: '100%', mb: 3, pt: { xs: 2, sm: 0 } }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: { xs: '2 / 1', sm: '3 / 1' },
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Sliding track — all banners side by side */}
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translateX(-${current * 100}%)`,
            transition: 'transform 0.4s ease-in-out',
          }}
        >
          {banners.map((banner, i) => {
            const imageEl = (
              <Box
                component="img"
                src={banner.imageUrl}
                alt={banner.title ?? 'Banner'}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', flexShrink: 0 }}
              />
            )
            return (
              <Box
                key={banner.id ?? `slide-${i}`}
                sx={{ minWidth: '100%', height: '100%', flexShrink: 0, cursor: banner.linkUrl ? 'pointer' : 'default' }}
              >
                {banner.linkUrl ? (
                  <Link href={banner.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                    {imageEl}
                  </Link>
                ) : imageEl}
              </Box>
            )
          })}
        </Box>

        {/* Prev / Next arrows */}
        {banners.length > 1 && (
          <>
            <Box
              onClick={prev}
              sx={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.35)', color: 'white', borderRadius: '50%',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none', fontSize: 18, zIndex: 1,
              }}
            >‹</Box>
            <Box
              onClick={next}
              sx={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.35)', color: 'white', borderRadius: '50%',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none', fontSize: 18, zIndex: 1,
              }}
            >›</Box>

            {/* Dots */}
            <Box
              sx={{
                position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 0.75, zIndex: 1,
              }}
            >
              {banners.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setCurrent(i)}
                  sx={{
                    width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                    bgcolor: i === current ? 'white' : 'rgba(255,255,255,0.5)',
                    transition: 'background-color 0.2s',
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

export default HomeBanner

