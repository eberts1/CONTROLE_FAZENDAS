import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProcessRecordsService } from './process-records.service';
import { CreateProcessRecordDto, UpdateProcessRecordDto } from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('process-records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/records')
export class ProcessRecordsController {
  constructor(private recordsService: ProcessRecordsService) {}

  @Get()
  findAll(@Param('farmId') farmId: string) {
    return this.recordsService.findAll(farmId);
  }

  @Get(':id')
  findOne(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.recordsService.findOne(farmId, id);
  }

  @Post()
  create(
    @Param('farmId') farmId: string,
    @Body() dto: CreateProcessRecordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recordsService.create(farmId, dto, user);
  }

  @Patch(':id')
  update(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProcessRecordDto,
  ) {
    return this.recordsService.update(farmId, id, dto);
  }

  @Delete(':id')
  remove(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.recordsService.remove(farmId, id);
  }
}
