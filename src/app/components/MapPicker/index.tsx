'use client'

import { useCallback, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, MapMouseEvent } from '@vis.gl/react-google-maps'
import { Box, Typography } from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'

interface MapPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const defaultCenter = { lat: latitude ?? 13.7563, lng: longitude ?? 100.5018 }
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
    latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null
  )

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.detail.latLng) return
      const { lat, lng } = e.detail.latLng
      setMarkerPos({ lat, lng })
      onChange(lat, lng)
    },
    [onChange]
  )

  return (
    <Box>
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: '100%', height: 320, borderRadius: 8 }}
          defaultCenter={defaultCenter}
          defaultZoom={markerPos ? 15 : 6}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="venue-map-picker"
          onClick={handleClick}
        >
          {markerPos && (
            <AdvancedMarker position={markerPos}>
              <LocationOnIcon sx={{ color: '#d32f2f', fontSize: 40 }} />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
      {markerPos ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Selected: {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Click on the map to set the venue location
        </Typography>
      )}
    </Box>
  )
}
