import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Rocket,
  Clock,
  User,
  Monitor,
} from 'lucide-react'

const formatRelativeTime = value => {
  if (!value) return 'Inconnu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Inconnu'
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `il y a ${days}j`
  if (hours > 0) return `il y a ${hours}h`
  if (minutes > 0) return `il y a ${minutes}min`
  return "à l'instant"
}

const getVersionStatusUI = status => {
  if (status === 'up_to_date')
    return {
      label: 'À jour',
      icon: CheckCircle,
      className: 'bg-chart-2/15 text-chart-2 border-chart-2/30',
    }
  if (status === 'outdated')
    return {
      label: 'Obsolète',
      icon: AlertTriangle,
      className: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    }
  if (status === 'very_outdated')
    return {
      label: 'Très obsolète',
      icon: XCircle,
      className: 'bg-destructive/15 text-destructive border-destructive/30',
    }
  return {
    label: 'Inconnu',
    icon: HelpCircle,
    className: 'bg-muted text-muted-foreground border-border',
  }
}

const getHistoryStatusUI = status => {
  const normalized = (status || '').toLowerCase()
  if (normalized.includes('success') || normalized.includes('ok'))
    return {
      icon: CheckCircle,
      label: status,
      className: 'bg-chart-2/15 text-chart-2 border-chart-2/30',
    }
  if (normalized.includes('pending') || normalized.includes('progress'))
    return {
      icon: Clock,
      label: status,
      className: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    }
  if (normalized.includes('error') || normalized.includes('fail'))
    return {
      icon: XCircle,
      label: status,
      className: 'bg-destructive/15 text-destructive border-destructive/30',
    }
  return {
    icon: HelpCircle,
    label: status || '—',
    className: 'bg-muted text-muted-foreground border-border',
  }
}

export default function DeploymentsTab({
  versionMatrix,
  deployHistory,
  loading,
  onDeploy,
  deployHistoryFilters,
  setDeployHistoryFilters,
  devices,
}) {
  const rows = versionMatrix?.matrix || []
  const historyRows = deployHistory?.entries || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Matrice des versions</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            État des versions installées sur chaque tablette
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Monitor className="h-8 w-8 animate-pulse opacity-30" />
              <p className="text-sm">Chargement des versions...</p>
            </div>
          ) : !rows.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Monitor className="h-8 w-8 opacity-30" />
              <p className="text-sm">Aucune donnée de version</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6 font-semibold">Tablette</TableHead>
                  <TableHead className="font-semibold">Kiosk</TableHead>
                  <TableHead className="font-semibold">ProWin</TableHead>
                  <TableHead className="pr-6 text-right font-semibold">Déployer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry, index) => {
                  const kioskStatus = getVersionStatusUI(entry.kiosk?.status)
                  const prowinStatus = getVersionStatusUI(entry.prowin?.status)
                  const KioskIcon = kioskStatus.icon
                  const ProwinIcon = prowinStatus.icon
                  const isOutdated =
                    entry.kiosk?.status !== 'up_to_date' ||
                    entry.prowin?.status !== 'up_to_date'

                  return (
                    <TableRow
                      key={entry.deviceId}
                      className={`transition-colors hover:bg-muted/50 ${
                        index % 2 !== 0 ? 'bg-muted/15' : ''
                      }`}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              entry.online
                                ? 'bg-chart-2 shadow-sm shadow-chart-2/50'
                                : 'bg-muted-foreground/30'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-semibold leading-tight">
                              {entry.deviceName || entry.deviceId}
                            </p>
                            {entry.deviceModel && (
                              <p className="text-xs leading-tight text-muted-foreground">
                                {entry.deviceModel}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">
                            {entry.kiosk?.version || '—'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${kioskStatus.className}`}
                          >
                            <KioskIcon className="h-3 w-3" />
                            {kioskStatus.label}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">
                            {entry.prowin?.version || '—'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${prowinStatus.className}`}
                          >
                            <ProwinIcon className="h-3 w-3" />
                            {prowinStatus.label}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="pr-6 text-right">
                        <Button
                          size="sm"
                          variant={isOutdated ? 'default' : 'outline'}
                          className="gap-1.5"
                          onClick={() => onDeploy(entry)}
                        >
                          <Rocket className="h-3.5 w-3.5" />
                          Déployer
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Historique des déploiements</CardTitle>
              {historyRows.length > 0 && (
                <Badge variant="secondary" className="rounded-full tabular-nums text-xs">
                  {historyRows.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={deployHistoryFilters.deviceId || 'all'}
                onValueChange={value =>
                  setDeployHistoryFilters(current => ({ ...current, deviceId: value }))
                }
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Toutes les tablettes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les tablettes</SelectItem>
                  {(devices || []).map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.deviceName || device.deviceId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(deployHistoryFilters.limit || 20)}
                onValueChange={value =>
                  setDeployHistoryFilters(current => ({ ...current, limit: Number(value) }))
                }
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {!historyRows.length ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center text-muted-foreground">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-sm">Aucun historique de déploiement</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6 font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Tablette</TableHead>
                  <TableHead className="font-semibold">Package</TableHead>
                  <TableHead className="font-semibold">Version</TableHead>
                  <TableHead className="font-semibold">Action</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="pr-6 font-semibold">Initié par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((entry, index) => {
                  const statusUI = getHistoryStatusUI(entry.status)
                  const StatusIcon = statusUI.icon

                  return (
                    <TableRow
                      key={entry.id}
                      className={`transition-colors hover:bg-muted/50 ${
                        index % 2 !== 0 ? 'bg-muted/15' : ''
                      }`}
                    >
                      <TableCell className="pl-6">
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {entry.deviceName || entry.deviceId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.packageName || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">
                          {entry.versionName || '—'}
                          {entry.versionCode ? (
                            <span className="text-xs text-muted-foreground">
                              {' '}
                              ({entry.versionCode})
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {entry.action || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 text-xs ${statusUI.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusUI.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {entry.initiatedBy || '—'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
