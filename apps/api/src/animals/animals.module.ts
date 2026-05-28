import { Module } from '@nestjs/common';
import { AbczModule } from '../abcz/abcz.module';
import { AnimalsService } from './animals.service';
import { AnimalsController } from './animals.controller';

@Module({
  imports: [AbczModule],
  controllers: [AnimalsController],
  providers: [AnimalsService],
  exports: [AnimalsService],
})
export class AnimalsModule {}
