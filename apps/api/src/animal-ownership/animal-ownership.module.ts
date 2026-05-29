import { Module } from '@nestjs/common';
import { PartnersModule } from '../partners/partners.module';
import { AnimalOwnershipService } from './animal-ownership.service';
import { AnimalOwnershipController } from './animal-ownership.controller';

@Module({
  imports: [PartnersModule],
  controllers: [AnimalOwnershipController],
  providers: [AnimalOwnershipService],
  exports: [AnimalOwnershipService],
})
export class AnimalOwnershipModule {}
