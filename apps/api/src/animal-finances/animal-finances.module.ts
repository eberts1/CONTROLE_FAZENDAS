import { Module } from '@nestjs/common';
import { AnimalOwnershipModule } from '../animal-ownership/animal-ownership.module';
import { PartnersModule } from '../partners/partners.module';
import { FarmFinancesModule } from '../farm-finances/farm-finances.module';
import { AnimalFinancesService } from './animal-finances.service';
import { AnimalFinancesController } from './animal-finances.controller';

@Module({
  imports: [AnimalOwnershipModule, PartnersModule, FarmFinancesModule],
  controllers: [AnimalFinancesController],
  providers: [AnimalFinancesService],
  exports: [AnimalFinancesService],
})
export class AnimalFinancesModule {}
