import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CosStorageService } from './cos-storage.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, CosStorageService],
  exports: [MediaService],
})
export class MediaModule {}
