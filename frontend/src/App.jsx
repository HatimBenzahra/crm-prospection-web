import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import { RoleProvider } from '@/contexts/RoleContext'
import { useRole } from '@/contexts/userole'
import { DetailsSectionsProvider } from '@/contexts/DetailsSectionsProvider'
import { AppLoadingProvider } from '@/contexts/AppLoadingProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import SessionManager from '@/components/SessionManager'
import { OfflineSyncProvider } from '@/components/OfflineSyncProvider'

// Lazy load auth pages
const Login = lazy(() => import('@/pages-AUTH/Login'))
const Unauthorized = lazy(() => import('@/pages-AUTH/Unauthorized'))

// Lazy load admin/directeur pages
const Dashboard = lazy(() => import('@/pages-ADMIN-DIRECTEUR/dashboard/Dashboard'))
const Commerciaux = lazy(() => import('@/pages-ADMIN-DIRECTEUR/commercial/Commerciaux'))
const Managers = lazy(() => import('@/pages-ADMIN-DIRECTEUR/managers/Managers'))
const Directeurs = lazy(() => import('@/pages-ADMIN-DIRECTEUR/directeurs/Directeurs'))
const Immeubles = lazy(() => import('@/pages-ADMIN-DIRECTEUR/immeubles/Immeubles'))
const Zones = lazy(() => import('@/pages-ADMIN-DIRECTEUR/zones/Zones'))
const HistoriqueZones = lazy(() => import('@/pages-ADMIN-DIRECTEUR/zones/HistoriqueZones'))
const AssignationsEnCours = lazy(() => import('@/pages-ADMIN-DIRECTEUR/zones/AssignationsEnCours'))
const CommercialDetails = lazy(() => import('@/pages-ADMIN-DIRECTEUR/commercial/CommercialDetails'))
const ManagerDetails = lazy(() => import('@/pages-ADMIN-DIRECTEUR/managers/ManagerDetails'))
const DirecteurDetails = lazy(() => import('@/pages-ADMIN-DIRECTEUR/directeurs/DirecteurDetails'))
const ImmeubleDetails = lazy(() => import('@/pages-ADMIN-DIRECTEUR/immeubles/ImmeubleDetails'))
const ZoneDetails = lazy(() => import('@/pages-ADMIN-DIRECTEUR/zones/ZoneDetails'))
const GPSTracking = lazy(() => import('@/pages-ADMIN-DIRECTEUR/gps-tracking/GPSTracking'))
const EcouteLive = lazy(() => import('@/pages-ADMIN-DIRECTEUR/ecoutes/EcouteLive'))
const Enregistrement = lazy(() => import('@/pages-ADMIN-DIRECTEUR/ecoutes/Enregistrement'))
const Statistiques = lazy(() => import('@/pages-ADMIN-DIRECTEUR/statistiques/Statistiques'))
const Gestion = lazy(() => import('@/pages-ADMIN-DIRECTEUR/gestion/Gestion'))
const Gamification = lazy(() => import('@/pages-ADMIN-DIRECTEUR/gamification/Gamification'))

// Lazy load commercial pages
const CommercialLayoutComponent = lazy(
  () => import('@/pages-COMMERCIAL-MANAGER/layouts/CommercialLayout')
)
const CommercialDashboard = lazy(
  () => import('@/pages-COMMERCIAL-MANAGER/dashboard/CommercialDashboard')
)
const ImmeublesList = lazy(() => import('@/pages-COMMERCIAL-MANAGER/immeubles/ImmeublesList'))
const Historique = lazy(() => import('@/pages-COMMERCIAL-MANAGER/historique/Historique'))
const PortesGestion = lazy(() => import('@/pages-COMMERCIAL-MANAGER/portes/PortesGestion'))
const PortesLecture = lazy(() => import('@/pages-COMMERCIAL-MANAGER/portes/PortesLecture'))
const TeamManagement = lazy(() => import('@/pages-COMMERCIAL-MANAGER/team/TeamManagement'))

// Import Admin/Directeur/Manager Layout & Pages
import { AppSidebar } from '@/components/sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import ThemeToggle from '@/components/ThemeSwitchDarklight'
import ThemeSelector from '@/components/Theme'
import React from 'react'

// Layout pour Admin/Directeur/Manager (avec sidebar)
function AdminLayout() {
  const location = useLocation()

  const breadcrumbMap = {
    '': { label: 'Tableau de bord', href: '/' },
    dashboard: { label: 'Tableau de bord', href: '/' },
    commerciaux: { label: 'Commerciaux', href: '/commerciaux' },
    managers: { label: 'Managers', href: '/managers' },
    directeurs: { label: 'Directeurs', href: '/directeurs' },
    immeubles: { label: 'Immeubles', href: '/immeubles' },
    zones: { label: 'Zones', href: '/zones' },
    gestion: { label: 'Gestion', href: '/gestion' },
    'gps-tracking': { label: 'Suivi GPS', href: '/gps-tracking' },
    ecoutes: { label: 'Écoutes', href: '/ecoutes/live' },
    statistiques: { label: 'Statistiques', href: '/statistiques' },
    gamification: { label: 'Gamification', href: '/gamification' },
    assignations: { label: 'Assignations en cours', href: '/zones/assignations' },
    historique: { label: 'Historique', href: '/zones/historique' },
  }

  const buildBreadcrumbs = () => {
    const segments = location.pathname.replace(/^\//, '').split('/').filter(Boolean)

    // Si page d’accueil
    if (segments.length === 0) return [{ label: 'Tableau de bord', href: '/', isCurrent: true }]

    const breadcrumbs = []
    let accumulatedPath = ''

    segments.forEach((segment, index) => {
      accumulatedPath += `/${segment}`

      const isLast = index === segments.length - 1
      const mapping = breadcrumbMap[segment]

      const label = mapping?.label || (isNaN(Number(segment)) ? segment : 'Détails')
      const href = mapping?.href || accumulatedPath

      breadcrumbs.push({
        label,
        href,
        isCurrent: isLast,
      })
    })

    return [{ label: 'Tableau de bord', href: '/', isCurrent: false }, ...breadcrumbs]
  }

  const breadcrumbs = buildBreadcrumbs()

  return (
    <ErrorBoundary>
      <DetailsSectionsProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="overflow-x-hidden">
            <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <nav className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={`${crumb.href}-${index}`}>
                      {index > 0 && <span className="text-muted-foreground">›</span>}
                      {crumb.isCurrent ? (
                        <span className="text-foreground">{crumb.label}</span>
                      ) : (
                        <Link to={crumb.href} className="hover:text-foreground">
                          {crumb.label}
                        </Link>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-2 px-4">
                <ThemeSelector />
                <ThemeToggle />
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-6 pt-6 overflow-x-hidden mx-auto w-11/12 max-w-[1400px]">
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/commerciaux" element={<Commerciaux />} />
                  <Route path="/commerciaux/:id" element={<CommercialDetails />} />
                  <Route path="/managers" element={<Managers />} />
                  <Route path="/managers/:id" element={<ManagerDetails />} />
                  <Route path="/directeurs" element={<Directeurs />} />
                  <Route path="/directeurs/:id" element={<DirecteurDetails />} />
                  <Route path="/immeubles" element={<Immeubles />} />
                  <Route path="/immeubles/:id" element={<ImmeubleDetails />} />
                  <Route path="/zones" element={<Zones />} />
                  <Route path="/zones/historique" element={<HistoriqueZones />} />
                  <Route path="/zones/assignations" element={<AssignationsEnCours />} />
                  <Route path="/zones/:id" element={<ZoneDetails />} />
                  <Route path="/gestion" element={<Gestion />} />
                  <Route path="/gps-tracking" element={<GPSTracking />} />
                  <Route path="/ecoutes" element={<Navigate to="/ecoutes/live" replace />} />
                  <Route path="/ecoutes/live" element={<EcouteLive />} />
                  <Route path="/ecoutes/enregistrement" element={<Enregistrement />} />
                  <Route path="/statistiques" element={<Statistiques />} />
                  <Route path="/gamification/*" element={<Gamification />} />
                </Routes>
              </Suspense>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </DetailsSectionsProvider>
    </ErrorBoundary>
  )
}
// Layout pour Commercial (sans sidebar, interface mobile) && light mode pour les pages commerciales
function CommercialLayout() {
  return (
    <ErrorBoundary>
      <div className="light" data-theme="light">
        <Suspense fallback={null}>
          <Routes>
            {/* Toutes les routes sous CommercialLayout pour éviter les déconnexions LiveKit */}
            <Route element={<CommercialLayoutComponent />}>
              <Route path="/" element={<CommercialDashboard />} />
              <Route path="/immeubles" element={<ImmeublesList />} />
              <Route path="/historique" element={<Historique />} />
              <Route path="/equipe" element={<TeamManagement />} />
              <Route path="/portes/:immeubleId" element={<PortesGestion />} />
              <Route path="/portes/lecture/:immeubleId" element={<PortesLecture />} />
            </Route>

            {/* Fallback */}
            <Route path="/*" element={<CommercialDashboard />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}

// Composant principal qui route selon le rôle
function AppRouter() {
  const { isCommercial, isManager, isAuthenticated } = useRole()
  const location = useLocation()

  // Si l'utilisateur n'est pas authentifié, rediriger vers login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Si l'utilisateur est commercial, afficher l'interface dédiée
  if (isCommercial || isManager) {
    return <CommercialLayout />
  }

  // Sinon, afficher l'interface admin/manager/directeur
  return <AdminLayout />
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppLoadingProvider>
          <RoleProvider>
            <SessionManager />
            <OfflineSyncProvider>
              <Suspense fallback={null}>
                <Routes>
                  {/* Routes publiques */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  {/* Routes protégées */}
                  <Route path="/*" element={<AppRouter />} />
                </Routes>
              </Suspense>
            </OfflineSyncProvider>
          </RoleProvider>
        </AppLoadingProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
