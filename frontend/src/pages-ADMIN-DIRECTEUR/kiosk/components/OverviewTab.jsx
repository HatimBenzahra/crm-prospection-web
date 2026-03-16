import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/card'
import { Activity, Tablet, Wifi, WifiOff, BatteryWarning } from 'lucide-react'

const formatRelativeTime = value => {
  if (!value) return 'Inconnu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Inconnu'
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "A l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHour < 24) return `il y a ${diffHour} h`
  if (diffDay < 7) return `il y a ${diffDay} j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const formatUptime = uptimeSeconds => {
  const total = Math.max(0, Math.floor(Number(uptimeSeconds) || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const getLogBadgeStyle = type => {
  const normalized = (type || '').toLowerCase()
  if (normalized.includes('error')) return 'destructive'
  if (normalized.includes('warn')) return 'outline'
  return 'secondary'
}

export default function OverviewTab({
  health,
  devices,
  recentLogs,
  onlineCount,
  offlineCount,
  lowBatteryCount,
}) {
  const latestVersions = Object.entries(health?.latestVersions || {})

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Sante du serveur OTA</span>
            <Badge
              variant={health?.status === 'ok' ? 'secondary' : 'destructive'}
              className={health?.status === 'ok' ? 'bg-chart-2/15 text-chart-2 border-chart-2/30' : ''}
            >
              {health?.status === 'ok' ? 'En ligne' : 'Hors ligne'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Uptime</p>
            <p className="font-semibold">{formatUptime(health?.uptime)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Derniere synchro</p>
            <p className="font-semibold">{formatRelativeTime(health?.timestamp)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Releases connues</p>
            <p className="font-semibold">{health?.totalReleases || 0}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total tablettes"
          value={devices?.length || 0}
          variant="primary"
          icon={<Tablet />}
        />
        <StatsCard title="En ligne" value={onlineCount || 0} variant="success" icon={<Wifi />} />
        <StatsCard
          title="Hors ligne"
          value={offlineCount || 0}
          variant="destructive"
          icon={<WifiOff />}
        />
        <StatsCard
          title="Batterie faible"
          value={lowBatteryCount || 0}
          variant="warning"
          icon={<BatteryWarning />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dernieres versions publiees</CardTitle>
          </CardHeader>
          <CardContent>
            {latestVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune version disponible</p>
            ) : (
              <div className="space-y-2">
                {latestVersions.map(([packageName, version]) => (
                  <div key={packageName} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium text-sm">{version.appName || packageName}</p>
                      <p className="text-xs text-muted-foreground">{packageName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{version.versionName || '-'}</p>
                      <p className="text-xs text-muted-foreground">code {version.versionCode || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activite recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs?.length ? (
              <div className="space-y-2">
                {recentLogs.map(log => (
                  <div key={log.id} className="border-b pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={getLogBadgeStyle(log.type)} className="text-[10px]">
                        {log.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 line-clamp-2">{log.message || 'Sans message'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune activite recente</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
