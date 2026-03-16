import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import MapboxMap, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MapPin, Wifi, Battery, BatteryLow, BatteryMedium, BatteryFull, Info,
  Maximize, Minimize, Mountain, Building2, Layers, Crosshair,
} from 'lucide-react'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

const MAP_STYLES = [
  { url: 'mapbox://styles/mapbox/streets-v12', label: 'Plan' },
  { url: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite' },
  { url: 'mapbox://styles/mapbox/dark-v11', label: 'Sombre' },
]

const BUILDINGS_LAYER_DEF = {
  id: 'kiosk-3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  filter: ['==', 'extrude', 'true'],
  type: 'fill-extrusion',
  minzoom: 14,
  paint: {
    'fill-extrusion-color': '#aaa',
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-base': ['get', 'min_height'],
    'fill-extrusion-opacity': 0.6,
  },
}

const formatRelativeTime = value => {
  if (!value) return 'Inconnu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Inconnu'
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffSec < 60) return "À l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHour < 24) return `il y a ${diffHour} h`
  if (diffDay < 7) return `il y a ${diffDay} j`
  return date.toLocaleDateString('fr-FR')
}

const getBatteryIcon = level => {
  if (!level || level < 20) return BatteryLow
  if (level < 50) return Battery
  if (level < 80) return BatteryMedium
  return BatteryFull
}

const getBatteryColor = level => {
  if (!level || level < 20) return 'text-destructive'
  if (level < 50) return 'text-chart-5'
  return 'text-chart-2'
}

const getDeviceInitial = device =>
  ((device.deviceName || device.deviceId || '?')[0] || '?').toUpperCase()

const AVATAR_COLORS = [
  'bg-chart-2/15 text-chart-2',
  'bg-primary/15 text-primary',
  'bg-chart-5/15 text-chart-5',
  'bg-chart-1/15 text-chart-1',
  'bg-chart-3/15 text-chart-3',
]

const getAvatarColor = (_deviceId, index) =>
  AVATAR_COLORS[index % AVATAR_COLORS.length]

export default function LocationTab({ devices, loading }) {
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)
  const [viewState, setViewState] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [is3DTerrain, setIs3DTerrain] = useState(false)
  const [is3DBuildings, setIs3DBuildings] = useState(false)
  const [mapStyleIndex, setMapStyleIndex] = useState(0)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const is3DTerrainRef = useRef(false)
  const is3DBuildingsRef = useRef(false)

  const devicesWithGps = useMemo(
    () =>
      (devices || []).filter(
        device => typeof device.latitude === 'number' && typeof device.longitude === 'number'
      ),
    [devices]
  )

  const selectedDevice = useMemo(
    () => devicesWithGps.find(device => device.deviceId === selectedDeviceId) || null,
    [devicesWithGps, selectedDeviceId]
  )

  const center = useMemo(() => {
    if (!devicesWithGps.length) return { latitude: 48.86, longitude: 2.35, zoom: 10 }
    const latitude =
      devicesWithGps.reduce((sum, device) => sum + Number(device.latitude || 0), 0) /
      devicesWithGps.length
    const longitude =
      devicesWithGps.reduce((sum, device) => sum + Number(device.longitude || 0), 0) /
      devicesWithGps.length
    return { latitude, longitude, zoom: 11 }
  }, [devicesWithGps])

  useEffect(() => { is3DTerrainRef.current = is3DTerrain }, [is3DTerrain])
  useEffect(() => { is3DBuildingsRef.current = is3DBuildings }, [is3DBuildings])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleCardClick = useCallback(device => {
    setSelectedDeviceId(device.deviceId)
    setViewState({
      latitude: Number(device.latitude),
      longitude: Number(device.longitude),
      zoom: 14,
      transitionDuration: 800,
    })
  }, [])

  const setupMapExtras = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    try {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
      }
      if (is3DTerrainRef.current) {
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
      }
      if (is3DBuildingsRef.current && !map.getLayer('kiosk-3d-buildings')) {
        map.addLayer(BUILDINGS_LAYER_DEF)
      }
    } catch (_) {}
  }, [])

  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true)
    setupMapExtras()
    const map = mapRef.current?.getMap()
    if (map) {
      map.on('style.load', setupMapExtras)
    }
  }, [setupMapExtras])

  const handleToggle3DTerrain = useCallback(() => {
    if (!isMapLoaded) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const next = !is3DTerrain
    try {
      if (next) {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          })
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
        map.easeTo({ pitch: 60 })
      } else {
        map.setTerrain(null)
        map.easeTo({ pitch: 0 })
      }
      setIs3DTerrain(next)
      is3DTerrainRef.current = next
    } catch (_) {}
  }, [is3DTerrain, isMapLoaded])

  const handleToggle3DBuildings = useCallback(() => {
    if (!isMapLoaded) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const next = !is3DBuildings
    try {
      if (next) {
        if (!map.getLayer('kiosk-3d-buildings')) {
          map.addLayer(BUILDINGS_LAYER_DEF)
        }
      } else {
        if (map.getLayer('kiosk-3d-buildings')) {
          map.removeLayer('kiosk-3d-buildings')
        }
      }
      setIs3DBuildings(next)
      is3DBuildingsRef.current = next
    } catch (_) {}
  }, [is3DBuildings, isMapLoaded])

  const handleStyleSwitch = useCallback(() => {
    setMapStyleIndex(prev => (prev + 1) % MAP_STYLES.length)
  }, [])

  const handleFullscreenToggle = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    } catch (_) {}
  }, [])

  const handleCenterOnDevices = useCallback(() => {
    if (!devicesWithGps.length || !mapRef.current) return
    const bounds = new mapboxgl.LngLatBounds()
    devicesWithGps.forEach(d => { bounds.extend([d.longitude, d.latitude]) })
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 })
  }, [devicesWithGps])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm">Chargement des positions GPS...</span>
      </div>
    )
  }

  if (!MAPBOX_TOKEN) {
    return (
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm text-muted-foreground">
          Le token Mapbox est requis pour afficher la carte. Configurez{' '}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">VITE_MAPBOX_ACCESS_TOKEN</code>{' '}
          dans votre fichier d'environnement.
        </AlertDescription>
      </Alert>
    )
  }

  if (!devicesWithGps.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="rounded-full bg-muted/40 p-6">
          <MapPin className="h-10 w-10 text-muted-foreground/20" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Aucune position GPS</p>
          <p className="text-xs text-muted-foreground/60">
            Les tablettes sans données de localisation ne sont pas affichées
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl shadow-md border border-border/40"
      >
        <div className="relative">
          <MapboxMap
            ref={mapRef}
            {...(viewState || center)}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: isFullscreen ? '100vh' : 520 }}
            mapStyle={MAP_STYLES[mapStyleIndex].url}
            onLoad={handleMapLoad}
          >
            <NavigationControl position="top-right" />

            <div className="absolute top-3 left-3 z-10">
              <div className="flex flex-col gap-1 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg p-1.5">
                <button
                  type="button"
                  title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                  onClick={handleFullscreenToggle}
                  className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${
                    isFullscreen
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isFullscreen
                    ? <Minimize className="h-4 w-4" />
                    : <Maximize className="h-4 w-4" />
                  }
                </button>

                <div className="h-px bg-border/50 mx-1" />

                <button
                  type="button"
                  title="Terrain 3D"
                  onClick={handleToggle3DTerrain}
                  className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${
                    is3DTerrain
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mountain className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  title="Bâtiments 3D"
                  onClick={handleToggle3DBuildings}
                  className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${
                    is3DBuildings
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                </button>

                <div className="h-px bg-border/50 mx-1" />

                <div className="relative group">
                  <button
                    type="button"
                    title={`Style: ${MAP_STYLES[mapStyleIndex].label}`}
                    onClick={handleStyleSwitch}
                    className="h-9 w-9 flex items-center justify-center rounded-lg transition-all hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Layers className="h-4 w-4" />
                  </button>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="whitespace-nowrap rounded-md bg-background/95 backdrop-blur-sm border border-border/50 shadow-md px-2 py-1 text-[11px] font-medium text-foreground">
                      {MAP_STYLES[mapStyleIndex].label}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-border/50 mx-1" />

                <button
                  type="button"
                  title="Centrer"
                  onClick={handleCenterOnDevices}
                  className="h-9 w-9 flex items-center justify-center rounded-lg transition-all hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isFullscreen && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <span className="rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-md px-3 py-1.5 text-[11px] text-muted-foreground">
                  Appuyez sur Échap pour quitter
                </span>
              </div>
            )}

            {devicesWithGps.map(device => {
              const isOnline = device.online
              const isSelected = device.deviceId === selectedDeviceId

              return (
                <Marker
                  key={device.deviceId}
                  latitude={Number(device.latitude)}
                  longitude={Number(device.longitude)}
                  anchor="center"
                  onClick={event => {
                    event.originalEvent.stopPropagation()
                    setSelectedDeviceId(device.deviceId)
                  }}
                >
                  <button
                    type="button"
                    className="relative cursor-pointer focus:outline-none"
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedDeviceId(device.deviceId)
                    }}
                  >
                    {isOnline && (
                      <span
                        className="absolute inset-0 rounded-full bg-chart-2/40 animate-ping"
                        style={{ animationDuration: '2s' }}
                      />
                    )}
                    <div
                      className={`relative rounded-full border-2 border-white shadow-lg transition-transform ${
                        isSelected ? 'scale-125' : 'hover:scale-110'
                      } ${isOnline ? 'bg-chart-2 h-5 w-5' : 'bg-muted-foreground/50 h-4 w-4'}`}
                    />
                  </button>
                </Marker>
              )
            })}

            {selectedDevice && (
              <Popup
                latitude={Number(selectedDevice.latitude)}
                longitude={Number(selectedDevice.longitude)}
                anchor="top"
                onClose={() => setSelectedDeviceId(null)}
                closeButton
                maxWidth="260px"
              >
                <div className="p-3 space-y-3 min-w-[220px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate leading-tight">
                        {selectedDevice.deviceName || selectedDevice.deviceId}
                      </p>
                      {selectedDevice.model && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{selectedDevice.model}</p>
                      )}
                    </div>
                    <Badge
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 ${
                        selectedDevice.online
                          ? 'bg-chart-2/15 text-chart-2 border-chart-2/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }`}
                    >
                      {selectedDevice.online ? 'En ligne' : 'Hors ligne'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">Batterie</span>
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <div className="flex-1 max-w-[80px] bg-muted/50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (selectedDevice.batteryLevel || 0) < 20
                                ? 'bg-destructive'
                                : (selectedDevice.batteryLevel || 0) < 50
                                ? 'bg-chart-5'
                                : 'bg-chart-2'
                            }`}
                            style={{ width: `${selectedDevice.batteryLevel || 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium tabular-nums">
                          {selectedDevice.batteryLevel || 0}%
                        </span>
                      </div>
                    </div>

                    {selectedDevice.networkType && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">Réseau</span>
                        <div className="flex items-center gap-1">
                          <Wifi className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px]">{selectedDevice.networkType}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">Dernière vue</span>
                      <span className="text-[11px] font-medium">
                        {formatRelativeTime(selectedDevice.lastSeen)}
                      </span>
                    </div>

                    {selectedDevice.locationAccuracy != null && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">Précision GPS</span>
                        <span className="text-[11px] font-medium">
                          ±{Math.round(selectedDevice.locationAccuracy)} m
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 border-t border-border/40">
                    <p className="text-[10px] text-muted-foreground/70 font-mono tabular-nums">
                      {Number(selectedDevice.latitude).toFixed(5)},{' '}
                      {Number(selectedDevice.longitude).toFixed(5)}
                    </p>
                  </div>
                </div>
              </Popup>
            )}
          </MapboxMap>
        </div>
      </div>

      {!isFullscreen && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Tablettes géolocalisées
            </h3>
            <span className="text-xs text-muted-foreground">{devicesWithGps.length} tablette{devicesWithGps.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-0.5 px-0.5">
            {devicesWithGps.map((device, index) => {
              const isSelected = device.deviceId === selectedDeviceId
              const BattIcon = getBatteryIcon(device.batteryLevel)
              const battColor = getBatteryColor(device.batteryLevel)
              const avatarClass = getAvatarColor(device.deviceId, index)

              return (
                <button
                  key={device.deviceId}
                  type="button"
                  onClick={() => handleCardClick(device)}
                  className={`shrink-0 flex flex-col gap-2.5 rounded-xl border p-3.5 w-[175px] text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : 'border-border/60 bg-card hover:border-primary/20 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarClass}`}
                    >
                      {getDeviceInitial(device)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {device.deviceName || device.deviceId}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            device.online ? 'bg-chart-2' : 'bg-muted-foreground/40'
                          }`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {device.online ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <BattIcon className={`h-3 w-3 shrink-0 ${battColor}`} />
                      <div className="flex-1 bg-muted/40 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (device.batteryLevel || 0) < 20
                              ? 'bg-destructive'
                              : (device.batteryLevel || 0) < 50
                              ? 'bg-chart-5'
                              : 'bg-chart-2'
                          }`}
                          style={{ width: `${device.batteryLevel || 0}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium tabular-nums ${battColor}`}>
                        {device.batteryLevel || 0}%
                      </span>
                    </div>

                    <p className="text-[10px] text-muted-foreground/60 font-mono tabular-nums truncate">
                      {Number(device.latitude).toFixed(4)}, {Number(device.longitude).toFixed(4)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
