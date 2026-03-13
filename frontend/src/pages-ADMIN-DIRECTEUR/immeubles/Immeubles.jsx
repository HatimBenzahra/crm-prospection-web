import { lazy, Suspense } from 'react'
import { AdvancedDataTable } from '@/components/tableau'
import { MapSkeleton, TableSkeleton } from '@/components/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutList,
  Map as MapIcon,
  Info,
  Building,
  FileText,
  Percent,
  SlidersHorizontal,
  Calendar,
  User,
} from 'lucide-react'
import { useImmeublesLogic } from './useImmeublesLogic'

const AssignedZoneCard = lazy(() => import('@/components/AssignedZoneCard'))

export default function Immeubles() {
  const {
    viewMode,
    setViewMode,
    immeublesLoading,
    description,
    tableData,
    immeublesColumns,
    permissions,
    handleDeleteImmeuble,
    filteredImmeubles,
    stats,
    filterCommercial,
    setFilterCommercial,
    dateFilterMode,
    setDateFilterMode,
    createdDate,
    setCreatedDate,
    commercialsList,
  } = useImmeublesLogic()

  if (immeublesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Immeubles</h1>
          <p className="text-muted-foreground text-base">
            Gestion du patrimoine immobilier et suivi des propriétés
          </p>
        </div>
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-full mt-1">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <AlertTitle className="text-primary font-semibold">Gestion des Immeubles</AlertTitle>
            <AlertDescription className="text-muted-foreground text-sm leading-relaxed">
              Utilisez les filtres pour trier par date de création ou de modification, et filtrer
              par commercial. Basculez entre la vue liste et la vue carte pour visualiser vos
              immeubles sur une map.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Cartes de Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all duration-300 hover:shadow-lg hover:border-primary/20 dark:hover:border-primary/20 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Immeubles
            </CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Building className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalImmeubles}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dans votre parc immobilier</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg hover:border-primary/20 dark:hover:border-primary/20 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contrats Signés
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalContrats}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total cumulé des signatures</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg hover:border-primary/20 dark:hover:border-primary/20 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Couverture Moy.
            </CardTitle>
            <div className="p-2 bg-violet-500/10 rounded-full">
              <Percent className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.avgCouverture}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Portes prospectées</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filtres:</span>
          </div>

          <Select value={dateFilterMode} onValueChange={setDateFilterMode}>
            <SelectTrigger className="w-auto">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date / tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt_desc">Modifiés récemment</SelectItem>
              <SelectItem value="updatedAt_asc">Modifiés anciennement</SelectItem>
              <SelectItem value="createdAt_desc">Créés récemment</SelectItem>
              <SelectItem value="createdAt_asc">Créés anciennement</SelectItem>
              <SelectItem value="created_yesterday">Créés hier</SelectItem>
              <SelectItem value="created_this_week">Créés cette semaine</SelectItem>
              <SelectItem value="created_specific_date">Créés à une date</SelectItem>
            </SelectContent>
          </Select>

          {dateFilterMode === 'created_specific_date' && (
            <Input
              type="date"
              value={createdDate}
              onChange={event => setCreatedDate(event.target.value)}
              className="w-[170px] border-2 border-primary"
            />
          )}

          <Select value={filterCommercial} onValueChange={setFilterCommercial}>
            <SelectTrigger className="w-auto">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Commercial..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les commerciaux</SelectItem>
              {commercialsList?.map(commercial => (
                <SelectItem key={commercial.id} value={String(commercial.id)}>
                  {commercial.prenom} {commercial.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <LayoutList className="h-4 w-4" />
            Vue Liste
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            onClick={() => setViewMode('map')}
            className="gap-2"
          >
            <MapIcon className="h-4 w-4" />
            Vue Carte
          </Button>
        </div>
      </div>

      {/* Affichage conditionnel basé sur viewMode */}
      {viewMode === 'list' ? (
        <AdvancedDataTable
          showStatusColumn={false}
          title="Liste des Immeubles"
          description={description}
          data={tableData}
          columns={immeublesColumns}
          searchKey="address"
          detailsPath="/immeubles"
          onDelete={permissions.canDelete ? handleDeleteImmeuble : undefined}
        />
      ) : (
        <Suspense fallback={<MapSkeleton />}>
          <AssignedZoneCard
            showAllImmeubles={true}
            allImmeubles={filteredImmeubles}
            fullWidth={true}
          />
        </Suspense>
      )}
    </div>
  )
}
