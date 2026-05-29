import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FarmEventsService } from './farm-events.service';
import {
  CreateEventAnimalSaleDto,
  CreateFarmEventDto,
  UpdateFarmEventDto,
} from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('farm-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/events')
export class FarmEventsController {
  constructor(private farmEventsService: FarmEventsService) {}

  @Get()
  findAll(@Param('farmId') farmId: string) {
    return this.farmEventsService.findAll(farmId);
  }

  @Get(':id')
  findOne(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.farmEventsService.findOne(farmId, id);
  }

  @Get(':id/summary')
  getSummary(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.farmEventsService.getSummary(farmId, id);
  }

  @Get(':id/sales')
  findSales(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.farmEventsService.findSales(farmId, id);
  }

  @Post()
  create(@Param('farmId') farmId: string, @Body() dto: CreateFarmEventDto) {
    return this.farmEventsService.create(farmId, dto);
  }

  @Patch(':id')
  update(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFarmEventDto,
  ) {
    return this.farmEventsService.update(farmId, id, dto);
  }

  @Delete(':id')
  remove(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.farmEventsService.remove(farmId, id);
  }

  @Post(':id/sales')
  createSale(
    @Param('farmId') farmId: string,
    @Param('id') eventId: string,
    @Body() dto: CreateEventAnimalSaleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.farmEventsService.createSale(farmId, eventId, dto, user);
  }
}
