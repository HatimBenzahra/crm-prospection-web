import { Field, ObjectType, InputType } from '@nestjs/graphql';

@ObjectType()
export class RecordingResult {
  @Field() egressId: string;
  @Field() roomName: string;
  @Field() status: string;
  @Field() s3Key: string;
  @Field({ nullable: true }) url?: string;
}

@ObjectType()
export class RecordingItem {
  @Field() key: string;
  @Field({ nullable: true }) url?: string;
  @Field({ nullable: true }) size?: number;
  @Field({ nullable: true }) lastModified?: Date;
}

@ObjectType()
export class EgressState {
  @Field() egressId: string;
  @Field() status: string;
  @Field({ nullable: true }) roomName?: string;
  @Field({ nullable: true }) error?: string;
}

@InputType()
export class StartRecordingInput {
  @Field() roomName: string;
  @Field({ nullable: true, defaultValue: true })
  audioOnly?: boolean;

  @Field({ nullable: true })
  participantIdentity?: string;

  @Field({ nullable: true })
  immeubleId?: number;
}

@InputType()
export class StopRecordingInput {
  @Field() egressId: string;
}

@InputType()
export class RequestRecordingUploadInput {
  @Field() roomName: string;

  @Field({ nullable: true })
  immeubleId?: number;

  @Field({ nullable: true })
  participantIdentity?: string;

  @Field({ nullable: true, defaultValue: 'audio/mp4' })
  mimeType?: string;

  @Field({ nullable: true })
  duration?: number;

  @Field({ nullable: true })
  fileSize?: number;
}

@ObjectType()
export class RecordingUploadDetails {
  @Field() uploadUrl: string;
  @Field() s3Key: string;
  @Field() expiresIn: number;
}

@InputType()
export class ConfirmRecordingUploadInput {
  @Field() s3Key: string;

  @Field({ nullable: true })
  duration?: number;
}
