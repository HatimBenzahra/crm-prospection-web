import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { SpeechAnalysisService } from './speech-analysis.service';

@Module({
  providers: [TranscriptionService, SpeechAnalysisService],
  exports: [TranscriptionService, SpeechAnalysisService],
})
export class TranscriptionModule {}
