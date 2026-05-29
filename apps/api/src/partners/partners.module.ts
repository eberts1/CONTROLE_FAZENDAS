import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { PartnerImportService } from './partner-import.service';
import { SaleInstallmentsModule } from '../sale-installments/sale-installments.module';

@Module({
  imports: [SaleInstallmentsModule],
  controllers: [PartnersController],
  providers: [PartnersService, PartnerImportService],
  exports: [PartnersService],
})
export class PartnersModule {}
