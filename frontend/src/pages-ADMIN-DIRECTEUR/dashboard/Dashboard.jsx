import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CommercialRankingTable from '@/components/CommercialRankingTable'
import ActiveZonesSlider_Dashboard from '@/components/ActiveZonesSlider_Dashboard'
import { Pagination } from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getStatusLabel, getStatusColor } from '@/constants/domain/porte-status'
import {
  Building2,
  Users,
  Trophy,
  TrendingUp,
  Calendar,
  ArrowRight,
  DoorOpen,
  Mic,
  Play,
  Loader2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardLogic } from './useDashboardLogic'

const SEGMENT_FILTERS = [
  { key: 'ARGUMENTE', label: 'Argumenté' },
  { key: 'REFUS', label: 'Refus' },
  { key: 'CONTRAT_SIGNE', label: 'Contrats' },
  { key: 'RENDEZ_VOUS_PRIS', label: 'RDV' },
  { key: null, label: 'Tous' },
]

function KpiCard({ title, value, description, icon: Icon, trend }) {
  const isPositive = trend && trend > 0
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend !== undefined && trend !== null && (
          <div
            className={`flex items-center gap-1 mt-3 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}
          >
            <TrendingUp className={`h-3 w-3 ${!isPositive ? 'rotate-180' : ''}`} />
            {isPositive ? '+' : ''}
            {trend} vs hier
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SegmentRow({ segment, onClick, onImmeubleClick }) {
  const dur = `${Math.floor(segment.durationSec / 60)}:${String(Math.floor(segment.durationSec % 60)).padStart(2, '0')}`
  const score = segment.speechScore
  const time = segment.createdAt
    ? new Date(segment.createdAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'
  return (
    <tr onClick={onClick} className="hover:bg-muted/30 cursor-pointer transition-colors group">
      <td className="px-4 py-3">
        <div className="text-[13px] font-medium">Porte {segment.porteNumero}</div>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onImmeubleClick()
          }}
          className="text-[11px] text-primary/70 hover:text-primary hover:underline mt-0.5 text-left"
        >
          {segment.immeubleAdresse}
        </button>
      </td>
      <td className="px-4 py-3 text-[12px] text-muted-foreground">
        {segment.commercialNom || '—'}
      </td>
      <td className="px-4 py-3">
        {segment.statut && (
          <Badge variant="outline" className={`text-[10px] ${getStatusColor(segment.statut)}`}>
            {getStatusLabel(segment.statut)}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        {score != null ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
            <span
              className={`text-[12px] font-semibold tabular-nums ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}
            >
              {score}%
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{time}</td>
      <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{dur}</td>
      <td className="px-4 py-3">
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-primary transition-colors" />
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()

  const {
    today,
    totals,
    tauxConversion,
    paginatedRdv,
    currentRdvPage,
    setCurrentRdvPage,
    isLoading,
    segments,
    segmentsLoading,
    segmentFilter,
    setSegmentFilter,
    data: { commercials, managers, directeurs, statistics, immeubles, assignments, rdvToday },
  } = useDashboardLogic()

  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard-scroll')
    if (saved && !isLoading) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10))
      })
    }
  }, [isLoading])

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('dashboard-scroll', String(window.scrollY))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (isLoading)
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Aperçu des performances du jour</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">
            {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Contrats signés"
          value={totals.contrats}
          description="Signatures du jour"
          icon={Trophy}
        />
        <KpiCard
          title="Portes prospectées"
          value={totals.portes}
          description="Visites effectuées"
          icon={DoorOpen}
        />
        <KpiCard
          title="Rendez-vous pris"
          value={totals.rdv}
          description="Planifiés aujourd'hui"
          icon={Calendar}
        />
        <KpiCard
          title="Taux de conversion"
          value={tauxConversion}
          description={`${totals.immeubles} immeuble${totals.immeubles > 1 ? 's' : ''} prospecté${totals.immeubles > 1 ? 's' : ''}`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <CardTitle>Enregistrements du jour</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {segments.length} segment{segments.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 pt-2 overflow-x-auto scrollbar-none">
              {SEGMENT_FILTERS.map(filter => (
                <button
                  type="button"
                  key={filter.key ?? 'all'}
                  onClick={() => setSegmentFilter(filter.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                    segmentFilter === filter.key
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'text-muted-foreground/60 border-transparent hover:bg-muted/40 hover:text-muted-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {segmentsLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!segmentsLoading && segments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Mic className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucun enregistrement aujourd'hui</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Les segments apparaîtront quand les commerciaux prospecteront
                </p>
              </div>
            )}
            {!segmentsLoading && segments.length > 0 && (
              <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="px-4 py-2 text-left">Porte</th>
                      <th className="px-4 py-2 text-left">Commercial</th>
                      <th className="px-4 py-2 text-left">Statut</th>
                      <th className="px-4 py-2 text-left">Parole</th>
                      <th className="px-4 py-2 text-left">Heure</th>
                      <th className="px-4 py-2 text-left">Durée</th>
                      <th className="px-4 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {segments.map(seg => (
                      <SegmentRow
                        key={seg.id}
                        segment={seg}
                        onClick={() =>
                          navigate(`/immeubles/${seg.immeubleId}/portes/${seg.porteId}`)
                        }
                        onImmeubleClick={() => navigate(`/immeubles/${seg.immeubleId}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex flex-col gap-6">
          {rdvToday && rdvToday.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-primary" />
                    RDV du jour
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {rdvToday.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {paginatedRdv.items.map(porte => {
                    const immeuble = immeubles?.find(imm => imm.id === porte.immeubleId)
                    return (
                      <button
                        type="button"
                        key={porte.id}
                        onClick={() =>
                          navigate(`/immeubles/${porte.immeubleId}/portes/${porte.id}`)
                        }
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-primary/[0.03] transition-colors"
                      >
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Porte {porte.numero}</div>
                          <p className="text-xs text-muted-foreground truncate">
                            {immeuble?.adresse}
                          </p>
                        </div>
                        <span className="text-sm font-medium tabular-nums text-primary shrink-0">
                          {porte.rdvTime || '—'}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {paginatedRdv.totalPages > 1 && (
                  <div className="px-4 py-2 border-t">
                    <Pagination
                      currentPage={currentRdvPage}
                      totalPages={paginatedRdv.totalPages}
                      startIndex={paginatedRdv.startIndex}
                      endIndex={paginatedRdv.endIndex}
                      totalItems={rdvToday.length}
                      itemLabel="rendez-vous"
                      onPrevious={() => setCurrentRdvPage(prev => Math.max(1, prev - 1))}
                      onNext={() =>
                        setCurrentRdvPage(prev => Math.min(paginatedRdv.totalPages, prev + 1))
                      }
                      hasPreviousPage={currentRdvPage > 1}
                      hasNextPage={currentRdvPage < paginatedRdv.totalPages}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Équipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/commerciaux')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <span className="text-2xl font-bold">{commercials?.length || 0}</span>
                  <span className="text-[11px] text-muted-foreground">Commerciaux</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/managers')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <span className="text-2xl font-bold">{managers?.length || 0}</span>
                  <span className="text-[11px] text-muted-foreground">Managers</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/immeubles')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <span className="text-2xl font-bold">{immeubles?.length || 0}</span>
                  <span className="text-[11px] text-muted-foreground">Immeubles</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CommercialRankingTable
        commercials={commercials || []}
        directeurs={directeurs || []}
        managers={managers || []}
        statistics={statistics || []}
        currentUserRole="admin"
        title="Top Performers"
        description="Classement général des meilleures performances"
        limit={5}
      />

      <ActiveZonesSlider_Dashboard assignments={assignments || []} />
    </div>
  )
}
