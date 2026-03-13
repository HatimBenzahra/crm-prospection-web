import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EgressClient } from 'livekit-server-sdk';
import {
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from 'livekit-server-sdk';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  RecordingResult,
  RecordingItem,
  EgressState,
  StartRecordingInput,
  RequestRecordingUploadInput,
  RecordingUploadDetails,
  ConfirmRecordingUploadInput,
} from './recording.dto';
import { PrismaService } from '../prisma.service';
import { TranscriptionService } from '../transcription/transcription.service';

type RoomTarget = {
  type: 'COMMERCIAL' | 'MANAGER';
  id: number;
};

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  private readonly lkHost = process.env.LK_HOST!;
  private readonly lkApiKey = process.env.LK_API_KEY!;
  private readonly lkApiSecret = process.env.LK_API_SECRET!;

  private readonly region = process.env.AWS_REGION || 'eu-west-3';
  private readonly bucket = process.env.S3_BUCKET_NAME!;
  private readonly prefix = process.env.S3_PREFIX || 'recordings/';
  private readonly awsAccessKey = process.env.AWS_ACCESS_KEY_ID!;
  private readonly awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY!;

  // EgressClient needs HTTP(S) URL, convert if WSS provided
  private readonly egress = new EgressClient(
    this.lkHost.replace(/^wss?:\/\//, 'https://'),
    this.lkApiKey,
    this.lkApiSecret,
  );

  // Force l’usage des clés de .env (évite ~/.aws/credentials)
  private readonly s3 = new S3Client({
    region: this.region,
    credentials: {
      accessKeyId: this.awsAccessKey,
      secretAccessKey: this.awsSecretKey,
    },
  });

  private safeRoom(roomName: string) {
    return roomName.replace(/[:]/g, '_');
  }

  private urlCache = new Map<string, { url: string; expiry: number }>();

  constructor(
    private prisma: PrismaService,
    private transcription: TranscriptionService,
  ) {}

  private normalizeRoomName(roomName: string): string {
    if (roomName.includes(':')) {
      return roomName;
    }

    // Retro-compat: accepter les anciens formats room_type_id
    const legacy = roomName.split('_');
    if (legacy.length === 3 && legacy[0] === 'room') {
      return `room:${legacy[1]}:${legacy[2]}`;
    }

    return roomName;
  }

  private parseRoomIdentifier(roomName: string): RoomTarget | null {
    const normalized = this.normalizeRoomName(roomName);
    const parts = normalized.split(':');
    if (parts.length !== 3) {
      return null;
    }

    const type = parts[1].toUpperCase();
    const id = Number(parts[2]);

    if (!Number.isFinite(id)) {
      return null;
    }

    if (type !== 'COMMERCIAL' && type !== 'MANAGER') {
      return null;
    }

    return { type: type as RoomTarget['type'], id };
  }

  private parseParticipantIdentity(identity?: string): RoomTarget | null {
    if (!identity) {
      return null;
    }
    const [rawType, rawId] = identity.split('-');
    if (!rawType || !rawId) {
      return null;
    }
    const type = rawType.toUpperCase();
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return null;
    }
    if (type !== 'COMMERCIAL' && type !== 'MANAGER') {
      return null;
    }
    return { type: type as RoomTarget['type'], id };
  }

  private async ensureRoomAccess(
    roomName: string,
    userId: number,
    userRole: string,
  ): Promise<RoomTarget | null> {
    const target = this.parseRoomIdentifier(roomName);

    if (!target) {
      if (userRole === 'admin') {
        return null;
      }
      throw new ForbiddenException('Invalid room identifier');
    }

    if (userRole === 'admin') {
      return target;
    }

    if (target.type === 'COMMERCIAL') {
      const commercial = await this.prisma.commercial.findUnique({
        where: { id: target.id },
        select: { id: true, managerId: true, directeurId: true },
      });

      if (!commercial) {
        throw new NotFoundException('Commercial not found');
      }

      // Commercial peut accéder à lui-même
      if (userRole === 'commercial' && commercial.id === userId) {
        return target;
      }

      // Directeur peut accéder à ses commerciaux
      if (userRole === 'directeur' && commercial.directeurId === userId) {
        return target;
      }

      // Manager peut accéder à ses commerciaux
      if (userRole === 'manager' && commercial.managerId === userId) {
        return target;
      }

      throw new ForbiddenException('Access denied to this room');
    }

    if (target.type === 'MANAGER') {
      const manager = await this.prisma.manager.findUnique({
        where: { id: target.id },
        select: { id: true, directeurId: true },
      });

      if (!manager) {
        throw new NotFoundException('Manager not found');
      }

      // Directeur peut accéder à ses managers
      if (userRole === 'directeur' && manager.directeurId === userId) {
        return target;
      }

      // Manager peut accéder à lui-même
      if (userRole === 'manager' && manager.id === userId) {
        return target;
      }

      throw new ForbiddenException('Access denied to this room');
    }

    throw new ForbiddenException('Unsupported room target');
  }

  private extractRoomFromKey(key: string): string | null {
    if (!key.startsWith(this.prefix)) {
      return null;
    }
    const remainder = key.slice(this.prefix.length);
    const [safeRoom] = remainder.split('/');
    if (!safeRoom) {
      return null;
    }
    return safeRoom.replace(/_/g, ':');
  }

  private async signedUrlOrUndefined(key: string): Promise<string | undefined> {
    try {
      // Vérifier le cache (URLs valides 50 minutes)
      const cached = this.urlCache.get(key);
      if (cached && Date.now() < cached.expiry) {
        return cached.url;
      }

      // Générer nouvelle URL signée avec headers CORS pour streaming
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: 'audio/mp4',
        ResponseCacheControl: 'no-cache',
      });

      const url = await getSignedUrl(this.s3, command, {
        expiresIn: 3600,
      });

      // Mettre en cache (expiry = maintenant + 50 minutes)
      this.urlCache.set(key, {
        url,
        expiry: Date.now() + 50 * 60 * 1000,
      });

      return url;
    } catch {
      return undefined;
    }
  }

  /**
   * Démarre un enregistrement audio-only (par défaut) vers S3.
   * - Si `participantIdentity` est fourni → Participant Egress (cible unique)
   * - Sinon → Room Composite Egress.
   */
  async startRecording(
    input: StartRecordingInput,
    currentUser: { id: number; role: string },
  ): Promise<RecordingResult> {
    const {
      roomName,
      audioOnly = true,
      participantIdentity,
      immeubleId,
    } = input;

    const target = await this.ensureRoomAccess(
      roomName,
      currentUser.id,
      currentUser.role,
    );

    if (participantIdentity && target) {
      const parsed = this.parseParticipantIdentity(participantIdentity);
      if (!parsed || parsed.type !== target.type || parsed.id !== target.id) {
        throw new ForbiddenException(
          'Participant identity does not match the room owner',
        );
      }
    }

    const safe = this.safeRoom(roomName);
    const ts = new Date().toISOString().replace(/[:]/g, '-');

    let addressPart = '';
    if (immeubleId) {
      const immeuble = await this.prisma.immeuble.findUnique({
        where: { id: immeubleId },
        select: { adresse: true },
      });
      if (immeuble?.adresse) {
        // Nettoyage de l'adresse pour le nom de fichier
        addressPart = immeuble.adresse.replace(/[^a-z0-9]/gi, '_') + '_';
      }
    }

    // OGG (léger). Pour compat Safari, remplace par MP4:
    // fileType: EncodedFileType.MP4, fileKey = `${...}.mp4`
    const fileKey = `${this.prefix}${safe}/${addressPart}${ts}.mp4`;

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: fileKey,
      output: {
        case: 's3',
        value: new S3Upload({
          bucket: this.bucket,
          region: this.region,
          accessKey: this.awsAccessKey,
          secret: this.awsSecretKey,
        }),
      },
    });

    let info: any;
    if (participantIdentity) {
      // Cible uniquement le commercial (ex: "commercial-10")
      info = await this.egress.startParticipantEgress(
        roomName,
        participantIdentity,
        { file: fileOutput }, // EncodedOutputs
        { screenShare: false },
      );
    } else {
      // Room composite (n’enregistre que ce qui est publié)
      info = await this.egress.startRoomCompositeEgress(
        roomName,
        fileOutput, // <- le paramètre "output" requis
        { audioOnly }, // options
      );
    }

    this.logger.log(
      `Recording started: egressId=${info.egressId} room=${roomName} key=${fileKey}`,
    );

    const url = await this.signedUrlOrUndefined(fileKey);

    return {
      egressId: info.egressId,
      roomName,
      status: String(info.status),
      s3Key: fileKey,
      url,
    };
  }

  async stopRecording(
    egressId: string,
    currentUser: { id: number; role: string },
  ): Promise<boolean> {
    try {
      const list = await this.egress.listEgress({ egressId });
      const info: any = list[0];

      if (info?.roomName) {
        await this.ensureRoomAccess(
          info.roomName,
          currentUser.id,
          currentUser.role,
        );
      } else if (currentUser.role !== 'admin') {
        throw new ForbiddenException('Cannot verify recording ownership');
      }

      await this.egress.stopEgress(egressId);
      return true;
    } catch (e: any) {
      if (e instanceof ForbiddenException) {
        throw e;
      }
      this.logger.warn(`stopRecording(${egressId}): ${e?.message || e}`);
      // Si déjà FAILED/STOPPED, on considère OK pour l’UI
      return false;
    }
  }

  async listRecordings(
    roomName: string,
    currentUser: { id: number; role: string },
  ): Promise<RecordingItem[]> {
    await this.ensureRoomAccess(roomName, currentUser.id, currentUser.role);

    const safe = this.safeRoom(roomName);
    const prefix = `${this.prefix}${safe}/`;

    const out: RecordingItem[] = [];

    const resp = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    for (const obj of resp.Contents || []) {
      if (!obj.Key) continue;
      if (obj.Key.endsWith('_conv.mp4')) continue;
      out.push({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        url: await this.signedUrlOrUndefined(obj.Key),
      });
    }

    // tri décroissant par date
    out.sort(
      (a, b) =>
        (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0),
    );

    return out;
  }

  async egressState(
    egressId: string,
    currentUser: { id: number; role: string },
  ): Promise<EgressState> {
    const list = await this.egress.listEgress({ egressId });
    const info: any = list[0];
    if (!info) {
      return { egressId, status: 'UNKNOWN' };
    }

    if (info.roomName) {
      await this.ensureRoomAccess(
        info.roomName,
        currentUser.id,
        currentUser.role,
      );
    } else if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Cannot verify recording ownership');
    }

    return {
      egressId: info.egressId || info.id,
      status: String(info.status),
      roomName: info.roomName,
      error: info.error,
    };
  }

  async requestRecordingUpload(
    input: RequestRecordingUploadInput,
    currentUser: { id: number; role: string },
  ): Promise<RecordingUploadDetails> {
    const { roomName, immeubleId, mimeType = 'audio/mp4' } = input;

    await this.ensureRoomAccess(roomName, currentUser.id, currentUser.role);

    const safe = this.safeRoom(roomName);
    const ts = new Date().toISOString().replace(/[:]/g, '-');

    let addressPart = '';
    if (immeubleId) {
      const immeuble = await this.prisma.immeuble.findUnique({
        where: { id: immeubleId },
        select: { adresse: true },
      });
      if (immeuble?.adresse) {
        addressPart = immeuble.adresse.replace(/[^a-z0-9]/gi, '_') + '_';
      }
    }

    const ext = mimeType === 'audio/mp4' ? 'mp4' : 'm4a';
    const s3Key = `${this.prefix}${safe}/${addressPart}${ts}.${ext}`;

    const expiresIn = 900;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

    this.logger.log(
      `Upload URL generated: key=${s3Key} room=${roomName} user=${currentUser.role}-${currentUser.id}`,
    );

    return { uploadUrl, s3Key, expiresIn };
  }

  async confirmRecordingUpload(
    input: ConfirmRecordingUploadInput,
    currentUser: { id: number; role: string },
  ): Promise<RecordingItem> {
    const { s3Key, duration } = input;

    const roomName = this.extractRoomFromKey(s3Key);
    if (roomName) {
      await this.ensureRoomAccess(roomName, currentUser.id, currentUser.role);
    } else if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Unknown recording key');
    }

    const head = await this.s3.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: s3Key }),
    );

    this.logger.log(
      `Upload confirmed: key=${s3Key} size=${head.ContentLength} user=${currentUser.role}-${currentUser.id} duration=${duration ?? 'unknown'}`,
    );

    void this.transcription.processRecording(s3Key);

    const url = await this.signedUrlOrUndefined(s3Key);

    return {
      key: s3Key,
      size: head.ContentLength,
      lastModified: head.LastModified,
      url,
    };
  }

  async getStreamingUrl(
    key: string,
    currentUser: { id: number; role: string },
  ): Promise<string> {
    const roomName = this.extractRoomFromKey(key);
    if (roomName) {
      await this.ensureRoomAccess(roomName, currentUser.id, currentUser.role);
    } else if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Unknown recording key');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: 'audio/mp4',
        ResponseContentDisposition: 'inline',
      });

      return await getSignedUrl(this.s3, command, {
        expiresIn: 7200,
      });
    } catch (error) {
      this.logger.error(`Erreur génération URL streaming: ${error.message}`);
      throw error;
    }
  }

  async triggerConversationExtraction(
    key: string,
    currentUser: { id: number; role: string },
  ): Promise<boolean> {
    const roomName = this.extractRoomFromKey(key);
    if (roomName) {
      await this.ensureRoomAccess(roomName, currentUser.id, currentUser.role);
    } else if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Unknown recording key');
    }

    const convKey = key.replace(/\.mp4$/i, '_conv.mp4');

    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: convKey }),
      );
      return false;
    } catch {
      // Intentionally swallowed — file may not exist yet
    }

    if (this.transcription.isProcessing(key)) {
      return false;
    }

    void this.transcription.processRecording(key);
    return true;
  }

  getExtractionProgress(key: string): { step: string; current: number; total: number } | null {
    return this.transcription.getProgress(key);
  }

  async triggerBatchExtraction(
    keys: string[],
    currentUser: { id: number; role: string },
  ): Promise<number> {
    let started = 0;

    for (const key of keys) {
      const roomName = this.extractRoomFromKey(key);
      if (roomName) {
        try {
          await this.ensureRoomAccess(roomName, currentUser.id, currentUser.role);
        } catch {
          continue;
        }
      } else if (currentUser.role !== 'admin') {
        continue;
      }

      if (this.transcription.isProcessing(key)) continue;

      const convKey = key.replace(/\.mp4$/i, '_conv.mp4');
      try {
        await this.s3.send(
          new HeadObjectCommand({ Bucket: this.bucket, Key: convKey }),
        );
        continue;
      } catch {
        // falls through — file doesn't exist yet
      }

      void this.transcription.processRecording(key);
      started++;
    }

    return started;
  }

  getExtractionQueue(): { key: string; step: string; current: number; total: number }[] {
    return this.transcription.getQueueState();
  }

  async getProcessedKeys(keys: string[]): Promise<string[]> {
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const convKey = key.replace(/\.mp4$/i, '_conv.mp4');
        await this.s3.send(
          new HeadObjectCommand({ Bucket: this.bucket, Key: convKey }),
        );
        return key;
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  async getConversationStreamingUrl(
    key: string,
    currentUser: { id: number; role: string },
  ): Promise<string | null> {
    const roomName = this.extractRoomFromKey(key);
    if (roomName) {
      await this.ensureRoomAccess(roomName, currentUser.id, currentUser.role);
    } else if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Unknown recording key');
    }

    const convKey = key.replace(/\.mp4$/i, '_conv.mp4');

    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: convKey }),
      );
    } catch {
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: convKey,
        ResponseContentType: 'audio/mp4',
        ResponseContentDisposition: 'inline',
      });

      return await getSignedUrl(this.s3, command, {
        expiresIn: 7200,
      });
    } catch {
      return null;
    }
  }
}
