import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Trash2,
  ScrollText,
  XCircle,
  AlertTriangle,
  Info,
  Heart,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Tablet,
  Calendar,
  AlertOctagon,
} from 'lucide-react'
import useDeviceCommercialNames from '../useDeviceCommercialNames'

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

const formatDateTime = value => {
  if (!value) return 'Inconnu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Inconnu'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getLogTypeConfig = type => {
  const normalized = (type || '').toLowerCase()
  if (normalized.includes('error')) {
    return {
      icon: XCircle,
      bg: 'bg-destructive/10',
      text: 'text-destructive',
      border: 'border-l-destructive',
      dot: 'bg-destructive',
      label: type,
    }
  }
  if (normalized.includes('warn')) {
    return {
      icon: AlertTriangle,
      bg: 'bg-chart-5/10',
      text: 'text-chart-5',
      border: 'border-l-chart-5',
      dot: 'bg-chart-5',
      label: type,
    }
  }
  if (normalized.includes('heartbeat')) {
    return {
      icon: Heart,
      bg: 'bg-muted/60',
      text: 'text-muted-foreground',
      border: 'border-l-muted-foreground/30',
      dot: 'bg-muted-foreground/50',
      label: type,
    }
  }
  if (normalized.includes('update')) {
    return {
      icon: ArrowUp,
      bg: 'bg-chart-2/10',
      text: 'text-chart-2',
      border: 'border-l-chart-2',
      dot: 'bg-chart-2',
      label: type,
    }
  }
  return {
    icon: Info,
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-l-primary',
    dot: 'bg-primary',
    label: type,
  }
}

const getLevelConfig = level => {
  const normalized = (level || '').toLowerCase()
  if (normalized === 'error') return { dot: 'bg-destructive', label: 'error' }
  if (normalized === 'warn') return { dot: 'bg-chart-5', label: 'warn' }
  return { dot: 'bg-chart-2', label: 'info' }
}

export default function LogsTab({ logs, logTypes, loading, filters, setFilters, onClearLogs, devices }) {
  const { getCommercialName, getDeviceLabel } = useDeviceCommercialNames()
  const rows = logs?.logs || []
  const total = logs?.total || 0
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const toggleRow = id => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleClearConfirm = () => {
    onClearLogs()
    setShowClearConfirm(false)
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Logs Kiosk</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 min-w-[2rem]">
              {total}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive gap-1.5"
            onClick={() => setShowClearConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Effacer
          </Button>
        </div>

        {showClearConfirm && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive font-medium flex-1">
              Êtes-vous sûr ? Cette action est irréversible.
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs px-3"
              onClick={handleClearConfirm}
            >
              Confirmer
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-3"
              onClick={() => setShowClearConfirm(false)}
            >
              Annuler
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 border border-border/40 px-3 py-2.5">
          <div className="relative flex items-center min-w-[160px]">
            <Tablet className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Select
              value={filters.deviceId || 'all'}
              onValueChange={value => setFilters(current => ({ ...current, deviceId: value }))}
            >
              <SelectTrigger className="pl-8 h-8 text-xs bg-background border-border/60 min-w-[160px]">
                <SelectValue placeholder="Tablette" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les tablettes</SelectItem>
                {(devices || []).map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {getDeviceLabel(device)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            value={filters.type || 'all'}
            onValueChange={value => setFilters(current => ({ ...current, type: value }))}
          >
            <SelectTrigger className="h-8 text-xs bg-background border-border/60 min-w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {(logTypes || []).map(type => {
                const config = getLogTypeConfig(type)
                return (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${config.dot} shrink-0`} />
                      {type}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select
            value={filters.level || 'all'}
            onValueChange={value => setFilters(current => ({ ...current, level: value }))}
          >
            <SelectTrigger className="h-8 text-xs bg-background border-border/60 min-w-[110px]">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {['info', 'warn', 'error'].map(level => {
                const cfg = getLevelConfig(level)
                return (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
                      {level}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Du</span>
            <Input
              type="date"
              value={filters.from || ''}
              onChange={event => setFilters(current => ({ ...current, from: event.target.value }))}
              className="h-8 text-xs bg-background border-border/60 w-[130px]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Au</span>
            <Input
              type="date"
              value={filters.to || ''}
              onChange={event => setFilters(current => ({ ...current, to: event.target.value }))}
              className="h-8 text-xs bg-background border-border/60 w-[130px]"
            />
          </div>

          <Select
            value={String(filters.limit || 100)}
            onValueChange={value => setFilters(current => ({ ...current, limit: Number(value) }))}
          >
            <SelectTrigger className="h-8 text-xs bg-background border-border/60 w-[80px]">
              <SelectValue placeholder="Limite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-sm">Chargement des logs...</span>
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ScrollText className="h-14 w-14 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">Aucun log</p>
            <p className="text-xs text-muted-foreground/60">
              Les événements des tablettes apparaîtront ici
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground w-[140px]">
                  Date/Heure
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-[130px]">
                  Type
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-[140px]">
                  Tablette
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Message
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(log => {
                const typeConfig = getLogTypeConfig(log.type)
                const TypeIcon = typeConfig.icon
                const isExpanded = expandedRows.has(log.id)
                const hasExtra = log.message?.length > 90 || log.data
                const commercial = getCommercialName({
                  serialNumber: log.deviceId,
                  deviceId: log.deviceId,
                })

                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      className={`border-l-[3px] ${typeConfig.border} hover:bg-muted/30 transition-colors ${hasExtra ? 'cursor-pointer' : ''}`}
                      onClick={() => hasExtra && toggleRow(log.id)}
                    >
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium">{formatRelativeTime(log.timestamp)}</span>
                          <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${typeConfig.bg} ${typeConfig.text}`}
                        >
                          <TypeIcon className="h-3 w-3 shrink-0" />
                          {log.type || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <Tablet className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs truncate max-w-[110px] block font-semibold">
                              {commercial || 'Non assigné'}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[110px] block">
                              {log.deviceName || log.deviceId || '-'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}
                          >
                            {log.message || '-'}
                          </span>
                          {hasExtra && (
                            <span className="shrink-0 mt-0.5 text-muted-foreground/50">
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && log.data && (
                      <TableRow className={`border-l-[3px] ${typeConfig.border} bg-muted/10`}>
                        <TableCell colSpan={4} className="pt-0 pb-3 px-4">
                          <div className="rounded-md bg-muted/50 border border-border/40 p-3 mt-1">
                            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
                              Données
                            </p>
                            <pre className="text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-all">
                              {typeof log.data === 'string'
                                ? log.data
                                : JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
