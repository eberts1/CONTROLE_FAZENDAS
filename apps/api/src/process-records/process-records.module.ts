import { Module } from '@nestjs/common';
import { ProcessRecordsService } from './process-records.service';
import { ProcessRecordsController } from './process-records.controller';

@Module({
  controllers: [ProcessRecordsController],
  providers: [ProcessRecordsService],
})
export class ProcessRecordsModule {}
