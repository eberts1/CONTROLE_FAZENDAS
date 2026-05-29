import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnimalOwnershipService } from './animal-ownership.service';
import { ReplaceAnimalOwnershipDto } from '../common/dto';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('animal-ownership')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/animals/:animalId/ownership')
export class AnimalOwnershipController {
  constructor(private ownershipService: AnimalOwnershipService) {}

  @Get()
  findAll(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.ownershipService.findByAnimal(farmId, animalId);
  }

  @Put()
  replace(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Body() dto: ReplaceAnimalOwnershipDto,
  ) {
    return this.ownershipService.replace(farmId, animalId, dto);
  }
}
