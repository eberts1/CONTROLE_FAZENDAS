import { Module } from '@nestjs/common';
import { AnimalFinancesModule } from '../animal-finances/animal-finances.module';
import { FarmEventsController } from './farm-events.controller';
import { FarmEventsService } from './farm-events.service';

@Module({
  imports: [AnimalFinancesModule],
  controllers: [FarmEventsController],
  providers: [FarmEventsService],
})
export class FarmEventsModule {}
