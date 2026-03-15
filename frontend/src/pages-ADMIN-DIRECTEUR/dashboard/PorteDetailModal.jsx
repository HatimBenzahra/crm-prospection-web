import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Clock, User, Calendar, MessageSquare, Mic } from 'lucide-react'
import { getStatusLabel, getStatusColor } from '@/constants/domain/porte-status'
import { usePorte, useRecordingSegmentsByPorte } from '@/hooks/metier/use-api'
import PorteHistoriqueTimeline from '../immeubles/components/PorteHistoriqueTimeline'

function SpeechScoreBadge({ score }) {
  if (score == null) return null
  const pct = Math.round(score)
  const colorClass =
    pct >= 70
      ? 'bg-green-100 text-green-800 border-green-200'
      : pct >= 40
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200'
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass}`}
    >
      Score vocal: {pct}%
    </span>
  )
}

function SegmentCard({ segment }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(segment.createdAt)
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const durationMin = segment.durationSec ? Math.floor(segment.durationSec / 60) : 0
  const durationSec = segment.durationSec ? segment.durationSec % 60 : 0
  const durationLabel = `${durationMin}:${String(durationSec).padStart(2, '0')}`

  const truncateLimit = 180
  const hasLongTranscription = segment.transcription && segment.transcription.length > truncateLimit
  const displayedTranscription =
    hasLongTranscription && !expanded
      ? segment.transcription.slice(0, truncateLimit) + '\u2026'
      : segment.transcription

  return (
    <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {dateStr} à {timeStr}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>{durationLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {segment.statut && (
            <Badge className={`text-[10px] ${getStatusColor(segment.statut)}`}>
              {getStatusLabel(segment.statut)}
            </Badge>
          )}
          <SpeechScoreBadge score={segment.speechScore} />
        </div>
      </div>

      {segment.streamingUrl && (
        <audio controls src={segment.streamingUrl} className="w-full h-9 mb-2">
          <track kind="captions" />
        </audio>
      )}

      {segment.transcription && (
        <div className="bg-muted/50 rounded p-2.5 text-xs text-muted-foreground border border-muted">
          <div className="flex items-start gap-1.5">
            <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="italic leading-relaxed">{displayedTranscription}</p>
              {hasLongTranscription && (
                <button
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  className="mt-1 text-[11px] text-primary hover:underline"
                >
                  {expanded ? 'Voir moins' : 'Voir plus'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PorteDetailModal({ open, onOpenChange, porteId, immeuble }) {
  const { data: porte, loading } = usePorte(porteId)
  const { data: segments, loading: segmentsLoading } = useRecordingSegmentsByPorte(porteId)

  const normalizedStatut = porte?.statut?.toUpperCase()
  const statusLabel = getStatusLabel(normalizedStatut)
  const statusColor = getStatusColor(normalizedStatut)

  const derniereVisite = porte?.derniereVisite
    ? new Date(porte.derniereVisite).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              {loading ? (
                'Chargement...'
              ) : porte ? (
                <>
                  Porte {porte.numero}
                  {porte.nomPersonnalise && (
                    <span className="text-muted-foreground font-normal ml-2">
                      — {porte.nomPersonnalise}
                    </span>
                  )}
                </>
              ) : (
                'Porte introuvable'
              )}
            </DialogTitle>
            {normalizedStatut && <Badge className={statusColor}>{statusLabel}</Badge>}
          </div>
          {immeuble && (
            <p className="text-sm text-muted-foreground mt-0.5">{immeuble.adresse}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : porte ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Étage
                  </p>
                  <p className="text-sm font-semibold">{porte.etage}</p>
                </div>

                {derniereVisite && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Dernière visite
                    </p>
                    <p className="text-sm font-semibold">{derniereVisite}</p>
                  </div>
                )}

                {porte.nbRepassages > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Repassages
                    </p>
                    <p className="text-sm font-semibold">{porte.nbRepassages}</p>
                  </div>
                )}

                {porte.rdvDate && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[10px] font-medium text-primary/80 uppercase tracking-wide mb-1">
                      RDV
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {new Date(porte.rdvDate).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                      {porte.rdvTime && ` à ${porte.rdvTime}`}
                    </p>
                  </div>
                )}
              </div>

              {porte.commentaire && (
                <div className="bg-muted/50 rounded-lg p-3 border border-muted">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Commentaire
                  </p>
                  <p className="text-sm italic text-muted-foreground leading-relaxed">
                    {porte.commentaire}
                  </p>
                </div>
              )}

              <Separator />

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Enregistrements</h3>
                  {!segmentsLoading && segments && (
                    <Badge variant="secondary" className="text-[10px]">
                      {segments.length}
                    </Badge>
                  )}
                </div>

                {segmentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Chargement des enregistrements...</span>
                  </div>
                ) : segments && segments.length > 0 ? (
                  <div className="space-y-2">
                    {segments.map(segment => (
                      <SegmentCard key={segment.id} segment={segment} />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-lg border text-center">
                    <Mic className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Aucun enregistrement</p>
                  </div>
                )}
              </section>

              <Separator />

              <section>
                <PorteHistoriqueTimeline porteId={porte.id} porteNumero={porte.numero} />
              </section>
            </>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Porte introuvable.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
