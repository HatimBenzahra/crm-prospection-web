import { graphqlClient } from '../../core/graphql'
import { logger as Logger } from '../../core/graphql'
import type {
  RecordingData,
  EnrichedRecording,
  StartRecordingInput,
  StartRecordingResponse,
  StopRecordingInput,
} from './recording.types'

// GraphQL Queries pour les enregistrements
const LIST_RECORDINGS = `
  query ListRecordings($roomName: String!) {
    listRecordings(roomName: $roomName) {
      key
      size
      lastModified
      url
    }
  }
`

const START_RECORDING = `
  mutation StartRecording($input: StartRecordingInput!) {
    startRecording(input: $input) {
      egressId
      roomName
      status
      s3Key
      url
    }
  }
`

const STOP_RECORDING = `
  mutation StopRecording($input: StopRecordingInput!) {
    stopRecording(input: $input)
  }
`

const GET_STREAMING_URL = `
  query GetStreamingUrl($key: String!) {
    getStreamingUrl(key: $key)
  }
`

const GET_CONVERSATION_STREAMING_URL = `
  query GetConversationStreamingUrl($key: String!) {
    getConversationStreamingUrl(key: $key)
  }
`

const TRIGGER_CONVERSATION_EXTRACTION = `
  mutation TriggerConversationExtraction($key: String!) {
    triggerConversationExtraction(key: $key)
  }
`

const GET_EXTRACTION_PROGRESS = `
  query GetExtractionProgress($key: String!) {
    getExtractionProgress(key: $key) {
      step
      current
      total
    }
  }
`

// Service pour la gestion des enregistrements
export class RecordingService {
  /**
   * Récupère la liste des enregistrements pour un utilisateur (commercial ou manager)
   * @param {number} userId - ID de l'utilisateur
   * @param {string} userType - Type d'utilisateur ('commercial' ou 'manager')
   * @returns {Promise<Array>} Liste des enregistrements filtrés (uniquement .mp4)
   */
  static async getRecordingsForUser(
    userId: number,
    userType: string
  ): Promise<EnrichedRecording[]> {
    try {
      // Le backend, LiveKit et les clés S3 attendent le format room:<userType>:<id>
      // (le service backend remplace les deux-points par des underscores pour le stockage)
      const roomName = `room:${userType.toLowerCase()}:${userId}`
      console.log(
        '🔍 Recherche enregistrements pour roomName:',
        roomName,
        `(${userType} ID: ${userId})`
      )

      const data = await graphqlClient.request(LIST_RECORDINGS, {
        roomName,
      })

      console.log('📦 Données reçues de S3:', data)
      console.log('📋 Liste brute:', data.listRecordings)

      // Filtrer uniquement les fichiers .mp4
      const recordings: RecordingData[] = data.listRecordings.filter(
        (recording: RecordingData) =>
          recording.key && recording.key.toLowerCase().endsWith('.mp4')
      )

      console.log('🎬 Fichiers .mp4 filtrés:', recordings)

      // Enrichir les données pour l'affichage (sans charger les URLs immédiatement)
      const enrichedRecordings: EnrichedRecording[] = recordings.map(
        (recording: RecordingData) => ({
          id: recording.key,
          key: recording.key,
          url: null, // On charge l'URL seulement quand on clique sur "Écouter"
          rawUrl: recording.url, // Garde l'URL originale pour lazy loading
          size: recording.size,
          lastModified: recording.lastModified,
          // Extraire des infos du nom de fichier si possible
          filename: recording.key.split('/').pop() || '',
          date: recording.lastModified
            ? new Date(recording.lastModified).toLocaleDateString()
            : '',
          time: recording.lastModified
            ? new Date(recording.lastModified).toLocaleTimeString()
            : '',
          duration: this.formatFileSize(recording.size), // On affiche la taille en attendant la vraie durée
          userId,
          userType,
        })
      )

      console.log('✨ Enregistrements enrichis:', enrichedRecordings)
      return enrichedRecordings
    } catch (error) {
      console.error('❌ Erreur récupération enregistrements:', error)
      throw error
    }
  }

  /**
   * Démarre un enregistrement pour un utilisateur (commercial ou manager)
   */
  static async startRecording(
    userId: number,
    userType: string,
    audioOnly = true,
    immeubleId: number | null = null
  ): Promise<StartRecordingResponse> {
    try {
      Logger.debug('🔧 Service startRecording appelé avec:', {
        userId,
        userType,
        audioOnly,
        immeubleId,
      })

      const roomName = `room:${userType.toLowerCase()}:${userId}`

      console.log('🎤 Démarrage enregistrement (room composite):', {
        roomName,
        audioOnly,
        mode: 'composite',
      })

      const data = await graphqlClient.request(START_RECORDING, {
        input: {
          roomName,
          audioOnly,
          immeubleId,
          // Room composite : fonctionne parfaitement
          // participantIdentity non spécifié = room composite
        },
      })

      Logger.debug('✅ Réponse startRecording:', data.startRecording)
      return data.startRecording
    } catch (error) {
      Logger.debug('❌ Erreur démarrage enregistrement:', error)
      throw error
    }
  }

  /**
   * Arrête un enregistrement
   */
  static async stopRecording(egressId: string): Promise<void> {
    try {
      Logger.debug('🛑 Arrêt enregistrement, egressId:', egressId)

      const data = await graphqlClient.request(STOP_RECORDING, {
        input: { egressId },
      })

      Logger.debug('✅ Réponse stopRecording:', data.stopRecording)
      return data.stopRecording
    } catch (error) {
      Logger.debug('❌ Erreur arrêt enregistrement:', error)
      throw error
    }
  }

  /**
   * Formate la taille du fichier en format lisible
   */
  static formatFileSize(bytes: number): string {
    if (!bytes) return '0 B'

    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))

    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  /**
   * Génère une URL optimisée pour le streaming
   */
  static async getStreamingUrl(key: string): Promise<string> {
    try {
      const data = await graphqlClient.request(GET_STREAMING_URL, { key })
      return data.getStreamingUrl
    } catch (error) {
      Logger.debug('Erreur génération URL streaming:', error)
      throw error
    }
  }

  /**
   * Télécharge un enregistrement
   */
  static async getConversationStreamingUrl(key: string): Promise<string | null> {
    try {
      const data = await graphqlClient.request(GET_CONVERSATION_STREAMING_URL, { key })
      return data.getConversationStreamingUrl || null
    } catch {
      return null
    }
  }

  static async triggerConversationExtraction(key: string): Promise<boolean> {
    const data = await graphqlClient.request(TRIGGER_CONVERSATION_EXTRACTION, { key })
    return data.triggerConversationExtraction
  }

  static async getExtractionProgress(key: string): Promise<{ step: string; current: number; total: number } | null> {
    try {
      const data = await graphqlClient.request(GET_EXTRACTION_PROGRESS, { key })
      return data.getExtractionProgress || null
    } catch {
      return null
    }
  }

  static downloadRecording(url: string, filename?: string): void {
    if (!url) return

    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'recording.mp4'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export default RecordingService
