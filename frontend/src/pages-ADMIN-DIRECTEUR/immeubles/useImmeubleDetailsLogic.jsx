import { useParams, Link } from 'react-router-dom'
import { useImmeuble, useCommercials, useManagers, useInfinitePortesByImmeuble } from '@/services'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel, getStatusColor } from '@/constants/domain/porte-status'

export function useImmeubleDetailsLogic() {
  const { id } = useParams()

  // API hooks
  const { data: immeuble, loading: immeubleLoading, error } = useImmeuble(parseInt(id))
  const { data: commercials } = useCommercials()
  const { data: managers } = useManagers()

  // Utiliser useInfinitePortesByImmeuble avec une grande pageSize pour charger toutes les portes
  // pageSize=10000 devrait couvrir même les très grands immeubles
  const { data: portes, loading: portesLoading } = useInfinitePortesByImmeuble(
    parseInt(id),
    10000,
    null
  )

  // Transformation des données API vers format UI
  const immeubleData = useMemo(() => {
    if (!immeuble) return null

    const commercial = commercials?.find(c => c.id === immeuble.commercialId)
    const manager = managers?.find(m => m.id === immeuble.managerId)
    const totalDoors = portes?.length || immeuble.nbEtages * immeuble.nbPortesParEtage

    // Déterminer le responsable (commercial ou manager)
    let commercialName = 'Non assigné'
    if (commercial) {
      commercialName = `${commercial.prenom} ${commercial.nom}`
    } else if (manager) {
      commercialName = `${manager.prenom} ${manager.nom} (Manager)`
    }

    // Grouper les portes par étage à partir des vraies données
    const floorDetails = portes
      ? Array.from({ length: immeuble.nbEtages }, (_, index) => {
          const floorNumber = index + 1
          const portesEtage = portes.filter(p => p.etage === floorNumber)

          return {
            floor: floorNumber,
            totalDoors: portesEtage.length,
            doors: portesEtage.map(porte => ({
              id: porte.id,
              number: porte.numero,
              status: porte.statut.toLowerCase(),
              rdvDate: porte.rdvDate
                ? new Date(porte.rdvDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : null,
              rdvTime: porte.rdvTime || null,
              comment: porte.commentaire || null,
              lastVisit: porte.updatedAt ? new Date(porte.updatedAt).toLocaleDateString() : null,
              nbRepassages: porte.nbRepassages || 0,
            })),
          }
        })
      : []

    return {
      ...immeuble,
      name: `Immeuble ${immeuble.adresse.split(',')[0]}`,
      address: immeuble.adresse,
      floors: immeuble.nbEtages,
      apartments: totalDoors,
      commercial_name: commercialName,
      has_elevator: immeuble.ascenseurPresent,
      digital_code: immeuble.digitalCode || 'Non défini',
      zone: immeuble.adresse.split(',')[1]?.trim() || 'Non spécifiée',
      created_at: immeuble.createdAt,
      updated_at: immeuble.updatedAt,
      floorDetails,
    }
  }, [immeuble, commercials, managers, portes])

  // Préparer les données pour le tableau - DOIT être après immeubleData mais avant les returns conditionnels
  const doorsData = useMemo(() => {
    if (!immeubleData?.floorDetails) return []

    const allDoors = []
    immeubleData.floorDetails.forEach(floor => {
      floor.doors.forEach(door => {
        allDoors.push({
          ...door,
          floor: floor.floor,
          porteId: door.id, // ID de la base de données pour l'historique
          tableId: `${floor.floor}-${door.number}`, // Clé unique pour le tableau React
          etage: `Étage ${floor.floor}`,
        })
      })
    })
    return allDoors
  }, [immeubleData?.floorDetails])

  const personalInfo = useMemo(() => {
    if (!immeubleData) return []
    return [
      { label: 'Adresse complète', value: immeubleData.address, icon: 'mapPin' },
      { label: 'Zone', value: immeubleData.zone, icon: 'mapPin' },
      { label: 'Commercial responsable', value: immeubleData.commercial_name, icon: 'users' },
      { label: "Nombre d'étages", value: immeubleData.floors, icon: 'building' },
      { label: 'Portes par étage', value: immeubleData.nbPortesParEtage, icon: 'building' },
      { label: 'Ascenseur', value: immeubleData.has_elevator ? 'Oui' : 'Non', icon: 'building' },
      { label: 'Code digital', value: immeubleData.digital_code, icon: 'key' },
    ]
  }, [immeubleData])

  const statsCards = useMemo(() => {
    if (!immeubleData) return []
    return [
      {
        title: 'Contrats signés',
        value: immeubleData.floorDetails.reduce(
          (acc, floor) => acc + floor.doors.filter(door => door.status === 'contrat_signe').length,
          0
        ),
        description: `Sur ${immeubleData.apartments} portes totales`,
        icon: 'trendingUp',
      },
      {
        title: 'RDV programmés',
        value: immeubleData.floorDetails.reduce(
          (acc, floor) =>
            acc + floor.doors.filter(door => door.status === 'rendez_vous_pris').length,
          0
        ),
        description: 'Rendez-vous à venir',
        icon: 'calendar',
      },
      {
        title: 'Absents',
        value: immeubleData.floorDetails.reduce(
          (acc, floor) => acc + floor.doors.filter(door => door.status === 'absent').length,
          0
        ),
        description: 'Personne absente',
        icon: 'users',
      },
      {
        title: 'Argumentés',
        value: immeubleData.floorDetails.reduce(
          (acc, floor) => acc + floor.doors.filter(door => door.status === 'argumente').length,
          0
        ),
        description: 'Refus après argumentation',
        icon: 'message-square',
      },
      {
        title: 'Refus',
        value: immeubleData.floorDetails.reduce(
          (acc, floor) => acc + floor.doors.filter(door => door.status === 'refus').length,
          0
        ),
        description: 'Propositions refusées',
        icon: 'building',
      },
    ]
  }, [immeubleData])

  // Définir les colonnes du tableau
  const columns = useMemo(
    () => [
      {
        header: 'Porte',
        accessor: 'number',
        sortable: true,
        className: 'font-medium',
        cell: row => (
          <Link
            to={`/immeubles/${id}/portes/${row.porteId}`}
            className="text-primary hover:underline font-medium"
          >
            {row.number}
          </Link>
        ),
      },
      {
        header: 'Étage',
        accessor: 'etage',
        sortable: true,
        className: 'text-sm',
      },
      {
        header: 'Statut',
        accessor: 'status',
        sortable: true,
        cell: row => {
          // Normaliser le statut et utiliser les helpers du fichier constants
          const normalizedStatus = row.status?.toUpperCase()
          const label = getStatusLabel(normalizedStatus)
          const colorClasses = getStatusColor(normalizedStatus)

          return <Badge className={colorClasses}>{label}</Badge>
        },
      },
      {
        header: 'RDV',
        accessor: 'rdvDate',
        sortable: true,
        cell: row => {
          if (row.rdvDate && row.rdvTime) {
            return (
              <div className="text-sm">
                <div>{row.rdvDate}</div>
                <div className="text-muted-foreground">{row.rdvTime}</div>
              </div>
            )
          }
          return <span className="text-muted-foreground">-</span>
        },
      },
      {
        header: 'Dernière visite',
        accessor: 'lastVisit',
        sortable: true,
        cell: row => row.lastVisit || <span className="text-muted-foreground">-</span>,
      },
      {
        header: 'Commentaire',
        accessor: 'comment',
        cell: row => {
          if (row.comment) {
            return (
              <div className="max-w-xs text-sm wrap-break-word whitespace-normal">
                {row.comment}
              </div>
            )
          }
          return <span className="text-muted-foreground">-</span>
        },
      },
    ],
    [id]
  )

  const additionalSections = useMemo(
    () => [
      {
        title: 'Tableau des portes',
        description: 'Statut de prospection pour chaque porte',
        type: 'custom',
        component: 'DoorsTable',
        data: {
          doors: doorsData,
          columns,
          customFilters: [
            { value: 'all', label: 'Tous les statuts' },
            { value: 'contrat_signe', label: 'Contrats signés' },
            { value: 'rendez_vous_pris', label: 'RDV programmés' },
            { value: 'absent', label: 'Absents' },
            { value: 'argumente', label: 'Argumentés' },
            { value: 'refus', label: 'Refus' },
            { value: 'necessite_repassage', label: 'Repassages nécessaires' },
            { value: 'non_visite', label: 'Non visités' },
          ],
        },
      },
    ],
    [doorsData, columns]
  )

  return {
    immeubleData,
    immeubleLoading,
    portesLoading,
    error,
    personalInfo,
    statsCards,
    additionalSections,
  }
}
