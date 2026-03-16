import React, { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  useKioskVersionMatrix,
  useKioskDeployHistory,
  useKioskDevices,
  useKioskDeploy,
} from '@/hooks/metier/api/kiosk'
import DeploymentsTab from './components/DeploymentsTab'
import DeployDialog from './components/DeployDialog'
import KioskErrorState from './components/KioskErrorState'

export default function KioskDeploymentsPage() {
  const versionMatrixQuery = useKioskVersionMatrix()
  const devicesQuery = useKioskDevices()
  const deployMutation = useKioskDeploy()

  const [deployDialog, setDeployDialog] = useState({ open: false, data: null })
  const [deployHistoryFilters, setDeployHistoryFilters] = useState({
    deviceId: 'all',
    limit: 20,
  })

  const normalizedDeployHistoryFilters = useMemo(
    () => ({
      deviceId: deployHistoryFilters.deviceId === 'all' ? undefined : deployHistoryFilters.deviceId,
      limit: Number(deployHistoryFilters.limit) || 20,
    }),
    [deployHistoryFilters]
  )

  const deployHistoryQuery = useKioskDeployHistory(normalizedDeployHistoryFilters)

  if (versionMatrixQuery.isLoading || deployHistoryQuery.isLoading || devicesQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Chargement des déploiements...</p>
          </div>
        </div>
      </div>
    )
  }

  const mainError = versionMatrixQuery.error || deployHistoryQuery.error || devicesQuery.error
  if (mainError) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Déploiements</h1>
          <p className="text-muted-foreground mt-1">
            Pilotage des déploiements OTA et suivi des exécutions
          </p>
        </div>
        <KioskErrorState
          error={mainError}
          onRetry={() => { versionMatrixQuery.refetch(); deployHistoryQuery.refetch(); devicesQuery.refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Déploiements</h1>
        <p className="text-muted-foreground mt-1">
          Pilotage des déploiements OTA et suivi des exécutions
        </p>
      </div>

      <DeploymentsTab
        versionMatrix={versionMatrixQuery.data}
        deployHistory={deployHistoryQuery.data}
        loading={versionMatrixQuery.isLoading || deployHistoryQuery.isLoading}
        onDeploy={device => setDeployDialog({ open: true, data: device })}
        deployHistoryFilters={deployHistoryFilters}
        setDeployHistoryFilters={setDeployHistoryFilters}
        devices={devicesQuery.data || []}
      />

      <DeployDialog
        open={deployDialog.open}
        onClose={() => setDeployDialog({ open: false, data: null })}
        onDeploy={payload => deployMutation.mutate(payload)}
        device={deployDialog.data}
        releases={versionMatrixQuery.data?.availableReleases || []}
        isPending={deployMutation.isPending}
      />
    </div>
  )
}
