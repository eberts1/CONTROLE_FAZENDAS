import { Module } from '@nestjs/common';
import { GeneticLotsController } from './genetic-lots.controller';
import { GeneticLotsService } from './genetic-lots.service';
import { StockMovementsService } from './stock-movements.service';

@Module({
  controllers: [GeneticLotsController],
  providers: [GeneticLotsService, StockMovementsService],
  exports: [GeneticLotsService, StockMovementsService],
})
export class GeneticLotsModule {}
