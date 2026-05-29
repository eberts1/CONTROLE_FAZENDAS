import { Module } from '@nestjs/common';
import { AnimalOwnershipModule } from '../animal-ownership/animal-ownership.module';
import { AnimalFinancesModule } from '../animal-finances/animal-finances.module';
import { AnimalManagementService } from './animal-management.service';
import { AnimalManagementController } from './animal-management.controller';

@Module({
  imports: [AnimalOwnershipModule, AnimalFinancesModule],
  controllers: [AnimalManagementController],
  providers: [AnimalManagementService],
})
export class AnimalManagementModule {}
