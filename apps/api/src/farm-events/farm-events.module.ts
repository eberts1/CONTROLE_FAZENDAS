import { Module } from '@nestjs/common';
import { AnimalFinancesModule } from '../animal-finances/animal-finances.module';
import { AnimalOwnershipModule } from '../animal-ownership/animal-ownership.module';
import { AnimalsModule } from '../animals/animals.module';
import { PartnersModule } from '../partners/partners.module';
import { SaleInstallmentsModule } from '../sale-installments/sale-installments.module';
import { FarmEventsController } from './farm-events.controller';
import { FarmEventsService } from './farm-events.service';
import { SaleMapImportService } from './sale-map-import.service';

@Module({
  imports: [
    AnimalFinancesModule,
    AnimalOwnershipModule,
    AnimalsModule,
    PartnersModule,
    SaleInstallmentsModule,
  ],
  controllers: [FarmEventsController],
  providers: [FarmEventsService, SaleMapImportService],
})
export class FarmEventsModule {}
