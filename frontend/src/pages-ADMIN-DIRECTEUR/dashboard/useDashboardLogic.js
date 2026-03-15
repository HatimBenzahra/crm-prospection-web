import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  useCommercials,
  useManagers,
  useDirecteurs,
  useStatistics,
  useImmeubles,
  useAllCurrentAssignments,
  usePortesModifiedToday,
  usePortesRdvToday,
} from '@/hooks/metier/use-api'
import { gql } from '@/services/core/graphql'

const GET_SEGMENTS_TODAY = `
  query RecordingSegmentsToday($statut: String, $limit: Int) {
    recordingSegmentsToday(statut: $statut, limit: $limit) {
      id
      porteId
      porteNumero
      porteEtage
      immeubleAdresse
      immeubleId
      commercialNom
      statut
      durationSec
      transcription
      speechScore
      status
      streamingUrl
      createdAt
    }
  }
`

export function useDashboardLogic() {
  const [currentRdvPage, setCurrentRdvPage] = useState(1)
  const [segmentFilter, setSegmentFilter] = useState(() => sessionStorage.getItem('dashboard-segment-filter') || 'ARGUMENTE')
  const [segments, setSegments] = useState([])
  const [segmentsLoading, setSegmentsLoading] = useState(false)
  const ITEMS_PER_PAGE = 4

  const { data: commercials, loading: loadingCommercials } = useCommercials()
  const { data: managers, loading: loadingManagers } = useManagers()
  const { data: directeurs, loading: loadingDirecteurs } = useDirecteurs()
  const { data: statistics, loading: loadingStats } = useStatistics()
  const { data: immeubles, loading: loadingImmeubles } = useImmeubles()
  const { data: assignments, loading: loadingAssignments } = useAllCurrentAssignments()
  const { data: portesModifiedToday, loading: loadingPortesModified } = usePortesModifiedToday()
  const { data: rdvToday, loading: loadingRdvToday } = usePortesRdvToday()

  const fetchSegments = useCallback(async (statut) => {
    setSegmentsLoading(true)
    try {
      const response = await gql(GET_SEGMENTS_TODAY, { statut, limit: 15 })
      setSegments(response.recordingSegmentsToday || [])
    } catch {
      setSegments([])
    } finally {
      setSegmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem('dashboard-segment-filter', segmentFilter || '')
    fetchSegments(segmentFilter)
  }, [segmentFilter, fetchSegments])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Calcul des stats à partir des portes modifiées aujourd'hui
  const totals = useMemo(() => {
    if (!portesModifiedToday) return { contrats: 0, rdv: 0, refus: 0, portes: 0, immeubles: 0 }

    const stats = {
      contrats: 0,
      rdv: 0,
      refus: 0,
      portes: portesModifiedToday.length,
      immeubles: 0,
    }

    // Compter par statut (avec somme des nbContrats pour CONTRAT_SIGNE)
    portesModifiedToday.forEach(porte => {
      if (porte.statut === 'CONTRAT_SIGNE') stats.contrats += (porte.nbContrats || 1)
      else if (porte.statut === 'RENDEZ_VOUS_PRIS') stats.rdv++
      else if (porte.statut === 'REFUS') stats.refus++
    })

    // Compter le nombre d'immeubles uniques
    const immeubleIds = new Set(portesModifiedToday.map(p => p.immeubleId))
    stats.immeubles = immeubleIds.size

    return stats
  }, [portesModifiedToday])

  const tauxConversion =
    totals.contrats + totals.rdv + totals.refus > 0
      ? `${Math.round((totals.contrats / (totals.contrats + totals.rdv + totals.refus)) * 100)}%`
      : '0%'

  // Pagination des rendez-vous
  const paginatedRdv = useMemo(() => {
    if (!rdvToday) return { items: [], totalPages: 0, startIndex: 0, endIndex: 0 }

    const startIndex = (currentRdvPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const items = rdvToday.slice(startIndex, endIndex)
    const totalPages = Math.ceil(rdvToday.length / ITEMS_PER_PAGE)

    return { items, totalPages, startIndex, endIndex }
  }, [rdvToday, currentRdvPage])

  const isLoading =
    loadingCommercials ||
    loadingManagers ||
    loadingDirecteurs ||
    loadingStats ||
    loadingImmeubles ||
    loadingAssignments ||
    loadingPortesModified ||
    loadingRdvToday

  return {
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
    data: {
      commercials,
      managers,
      directeurs,
      statistics,
      immeubles,
      assignments,
      rdvToday,
    },
  }
}
