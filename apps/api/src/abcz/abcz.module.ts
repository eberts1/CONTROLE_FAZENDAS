import { Module } from '@nestjs/common';
import { AbczClient } from './abcz.client';
import { AbczController } from './abcz.controller';
import { AbczService } from './abcz.service';
import { AbczSyncService } from './abcz-sync.service';

@Module({
  controllers: [AbczController],
  providers: [AbczClient, AbczService, AbczSyncService],
  exports: [AbczService, AbczSyncService],
})
export class AbczModule {}
