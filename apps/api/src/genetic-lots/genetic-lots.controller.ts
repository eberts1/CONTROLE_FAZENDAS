import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GeneticMaterialType } from '@prisma/client';
import { GeneticLotsService } from './genetic-lots.service';
import { StockMovementsService } from './stock-movements.service';
import { CreateGeneticLotDto, CreateStockMovementDto, UpdateGeneticLotDto } from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('genetic-lots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/genetic-lots')
export class GeneticLotsController {
  constructor(private geneticLotsService: GeneticLotsService, private stockMovementsService: StockMovementsService) {}

  @Get('summary')
  getSummary(@Param('farmId') farmId: string) { return this.geneticLotsService.getSummary(farmId); }

  @Get()
  findAll(@Param('farmId') farmId: string, @Query('materialType') materialType?: GeneticMaterialType, @Query('sourceAnimalId') sourceAnimalId?: string, @Query('lowStock') lowStock?: string) {
    return this.geneticLotsService.findAll(farmId, { materialType, sourceAnimalId, lowStock: lowStock === 'true' });
  }

  @Get(':id/movements')
  findMovements(@Param('farmId') farmId: string, @Param('id') id: string) { return this.stockMovementsService.findAll(farmId, id); }

  @Post(':id/movements')
  createMovement(@Param('farmId') farmId: string, @Param('id') id: string, @Body() dto: CreateStockMovementDto, @CurrentUser() user: AuthUser) {
    return this.stockMovementsService.create(farmId, id, dto, user);
  }

  @Get(':id')
  findOne(@Param('farmId') farmId: string, @Param('id') id: string) { return this.geneticLotsService.findOne(farmId, id); }

  @Post()
  create(@Param('farmId') farmId: string, @Body() dto: CreateGeneticLotDto, @CurrentUser() user: AuthUser) { return this.geneticLotsService.create(farmId, dto, user); }

  @Patch(':id')
  update(@Param('farmId') farmId: string, @Param('id') id: string, @Body() dto: UpdateGeneticLotDto) { return this.geneticLotsService.update(farmId, id, dto); }

  @Delete(':id')
  remove(@Param('farmId') farmId: string, @Param('id') id: string) { return this.geneticLotsService.remove(farmId, id); }
}
