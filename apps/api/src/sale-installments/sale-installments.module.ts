import { Module } from '@nestjs/common';
import { SaleInstallmentsController } from './sale-installments.controller';
import { SaleInstallmentsService } from './sale-installments.service';

@Module({
  controllers: [SaleInstallmentsController],
  providers: [SaleInstallmentsService],
  exports: [SaleInstallmentsService],
})
export class SaleInstallmentsModule {}
