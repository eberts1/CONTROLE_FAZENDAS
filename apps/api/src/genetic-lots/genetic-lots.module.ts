import { Module } from '@nestjs/common';
import { AnimalsModule } from '../animals/animals.module';
import { GeneticLotsController } from './genetic-lots.controller';
import { GeneticLotsService } from './genetic-lots.service';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [AnimalsModule],
  controllers: [GeneticLotsController],
  providers: [GeneticLotsService, StockMovementsService],
})
export class GeneticLotsModule {}
