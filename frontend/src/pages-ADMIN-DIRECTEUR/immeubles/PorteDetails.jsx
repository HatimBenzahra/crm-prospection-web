import { useState } from 'react'
import { usePorteDetailsLogic } from './usePorteDetailsLogic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Mic, Clock, User, Calendar, MessageSquare } from 'lucide-react'
import { getStatusLabel, getStatusColor } from '@/constants/domain/porte-status'
import PorteHistoriqueTimeline from './components/PorteHistoriqueTimeline'

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
      ? segment.transcription.slice(0, truncateLimit) + '…'
      : segment.transcription

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {dateStr} à {timeStr}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span>{durationLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {segment.statut && (
              <Badge className={`text-xs ${getStatusColor(segment.statut)}`}>
                {getStatusLabel(segment.statut)}
              </Badge>
            )}
            <SpeechScoreBadge score={segment.speechScore} />
            {segment.status && (
              <Badge variant="outline" className="text-xs">
                {segment.status}
              </Badge>
            )}
          </div>
        </div>

        {segment.streamingUrl && (
          <audio controls src={segment.streamingUrl} className="w-full h-10 mb-3">
            <track kind="captions" />
          </audio>
        )}

        {segment.transcription && (
          <div className="bg-muted/50 rounded p-3 text-sm text-muted-foreground border border-muted">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div>
                <p className="italic leading-relaxed">{displayedTranscription}</p>
                {hasLongTranscription && (
                  <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="mt-1 text-xs text-primary hover:underline"
                  >
                    {expanded ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PorteDetails() {
  const { porte, immeuble, segments, loading, segmentsLoading, error, goBack } =
    usePorteDetailsLogic()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Chargement de la fiche porte...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-800">Erreur lors du chargement : {error}</p>
      </div>
    )
  }

  if (!porte) {
    return (
      <div className="p-6 border border-muted rounded-lg bg-muted/30">
        <p className="text-muted-foreground">Porte introuvable.</p>
      </div>
    )
  }

  const normalizedStatut = porte.statut?.toUpperCase()
  const statusLabel = getStatusLabel(normalizedStatut)
  const statusColor = getStatusColor(normalizedStatut)

  const derniereVisite = porte.derniereVisite
    ? new Date(porte.derniereVisite).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={goBack} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Porte {porte.numero}
            {porte.nomPersonnalise && (
              <span className="text-muted-foreground font-normal ml-2">
                — {porte.nomPersonnalise}
              </span>
            )}
          </h1>
          {immeuble && <p className="text-sm text-muted-foreground mt-0.5">{immeuble.adresse}</p>}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Statut actuel</p>
                <Badge className={statusColor}>{statusLabel}</Badge>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Étage</p>
                    <p className="font-medium">Étage {porte.etage}</p>
                  </div>
                </div>

                {immeuble && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Immeuble</p>
                      <p className="font-medium leading-snug">{immeuble.adresse}</p>
                    </div>
                  </div>
                )}

                {derniereVisite && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dernière visite</p>
                      <p className="font-medium">{derniereVisite}</p>
                    </div>
                  </div>
                )}

                {porte.nbRepassages > 0 && (
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Repassages</p>
                      <p className="font-medium">{porte.nbRepassages}</p>
                    </div>
                  </div>
                )}

                {porte.rdvDate && (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded p-2">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-primary/80">RDV programmé</p>
                      <p className="font-medium text-primary">
                        {new Date(porte.rdvDate).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                        {porte.rdvTime && ` à ${porte.rdvTime}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {porte.commentaire && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Commentaire
                    </p>
                    <p className="text-sm italic text-muted-foreground leading-relaxed bg-muted/50 rounded p-2 border border-muted">
                      {porte.commentaire}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Mic className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Enregistrements</h2>
              {!segmentsLoading && segments && (
                <Badge variant="secondary" className="text-xs">
                  {segments.length} segment{segments.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {segmentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Chargement des enregistrements...</span>
              </div>
            ) : segments && segments.length > 0 ? (
              <div className="space-y-3">
                {segments.map(segment => (
                  <SegmentCard key={segment.id} segment={segment} />
                ))}
              </div>
            ) : (
              <div className="p-6 bg-muted/30 rounded-lg border text-center">
                <Mic className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun enregistrement disponible</p>
              </div>
            )}
          </section>

          <Separator />

          <section>
            <PorteHistoriqueTimeline porteId={porte.id} porteNumero={porte.numero} />
          </section>
        </main>
      </div>
    </div>
  )
}
