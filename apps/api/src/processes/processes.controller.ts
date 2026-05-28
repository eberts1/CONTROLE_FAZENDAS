import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProcessesService } from './processes.service';
import { CreateProcessDto, UpdateProcessDto } from '../common/dto';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/processes')
export class ProcessesController {
  constructor(private processesService: ProcessesService) {}

  @Get()
  findAll(@Param('farmId') farmId: string) {
    return this.processesService.findAll(farmId);
  }

  @Get(':id')
  findOne(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.processesService.findOne(farmId, id);
  }

  @Post()
  create(@Param('farmId') farmId: string, @Body() dto: CreateProcessDto) {
    return this.processesService.create(farmId, dto);
  }

  @Patch(':id')
  update(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProcessDto,
  ) {
    return this.processesService.update(farmId, id, dto);
  }

  @Delete(':id')
  remove(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.processesService.remove(farmId, id);
  }
}
