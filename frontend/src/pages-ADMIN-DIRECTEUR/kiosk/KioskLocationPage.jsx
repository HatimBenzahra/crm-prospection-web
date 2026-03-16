import React from 'react'
import { RefreshCw } from 'lucide-react'
import { useKioskDevices } from '@/hooks/metier/api/kiosk'
import LocationTab from './components/LocationTab'
import KioskErrorState from './components/KioskErrorState'

export default function KioskLocationPage() {
  const devicesQuery = useKioskDevices()

  if (devicesQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Chargement de la localisation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (devicesQuery.error) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Localisation</h1>
          <p className="text-muted-foreground mt-1">Carte des tablettes et dernière position connue</p>
        </div>
        <KioskErrorState error={devicesQuery.error} onRetry={() => devicesQuery.refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Localisation</h1>
        <p className="text-muted-foreground mt-1">Carte des tablettes et dernière position connue</p>
      </div>

      <LocationTab devices={devicesQuery.data || []} loading={devicesQuery.isLoading} />
    </div>
  )
}
