import { Module } from '@nestjs/common';
import { AbczModule } from '../abcz/abcz.module';
import { AnimalOwnershipModule } from '../animal-ownership/animal-ownership.module';
import { PartnersModule } from '../partners/partners.module';
import { AnimalsService } from './animals.service';
import { AnimalsController } from './animals.controller';

@Module({
  imports: [AbczModule, AnimalOwnershipModule, PartnersModule],
  controllers: [AnimalsController],
  providers: [AnimalsService],
  exports: [AnimalsService],
})
export class AnimalsModule {}
