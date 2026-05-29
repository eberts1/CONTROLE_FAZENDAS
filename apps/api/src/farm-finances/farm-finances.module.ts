import { Module } from '@nestjs/common';
import { FarmFinancesController } from './farm-finances.controller';
import { FarmFinancesService } from './farm-finances.service';

@Module({
  controllers: [FarmFinancesController],
  providers: [FarmFinancesService],
  exports: [FarmFinancesService],
})
export class FarmFinancesModule {}
