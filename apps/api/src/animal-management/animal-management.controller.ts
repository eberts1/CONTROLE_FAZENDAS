import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnimalManagementService } from './animal-management.service';
import {
  CreateAnimalManagementRecordDto,
  UpdateAnimalManagementRecordDto,
} from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('animal-management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/animals/:animalId/management-records')
export class AnimalManagementController {
  constructor(private managementService: AnimalManagementService) {}

  @Get()
  @ApiQuery({ name: 'category', required: false })
  findAll(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Query('category') category?: string,
  ) {
    return this.managementService.findAll(farmId, animalId, category);
  }

  @Get(':id')
  findOne(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('id') id: string,
  ) {
    return this.managementService.findOne(farmId, animalId, id);
  }

  @Post()
  create(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Body() dto: CreateAnimalManagementRecordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.managementService.create(farmId, animalId, dto, user);
  }

  @Patch(':id')
  update(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalManagementRecordDto,
  ) {
    return this.managementService.update(farmId, animalId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('id') id: string,
  ) {
    return this.managementService.remove(farmId, animalId, id);
  }
}
