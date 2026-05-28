import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AreasService } from './areas.service';
import { CreateAreaDto, UpdateAreaDto } from '../common/dto';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('areas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/areas')
export class AreasController {
  constructor(private areasService: AreasService) {}

  @Get()
  findAll(@Param('farmId') farmId: string) {
    return this.areasService.findAll(farmId);
  }

  @Get(':id')
  findOne(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.areasService.findOne(farmId, id);
  }

  @Post()
  create(@Param('farmId') farmId: string, @Body() dto: CreateAreaDto) {
    return this.areasService.create(farmId, dto);
  }

  @Patch(':id')
  update(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAreaDto,
  ) {
    return this.areasService.update(farmId, id, dto);
  }

  @Delete(':id')
  remove(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.areasService.remove(farmId, id);
  }
}
