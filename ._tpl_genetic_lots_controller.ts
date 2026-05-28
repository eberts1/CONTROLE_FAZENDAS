import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { GeneticLotsService } from './genetic-lots.service';
import { StockMovementsService } from './stock-movements.service';

@Controller('genetic-lots')
export class GeneticLotsController {
  constructor(
    private readonly geneticLotsService: GeneticLotsService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  @Get('summary')
  getSummary() {
    return this.geneticLotsService.getSummary();
  }

  @Get()
  findAll() {
    return this.geneticLotsService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      initialQuantity: number;
      notes?: string;
    },
  ) {
    return this.geneticLotsService.create(body);
  }

  @Get(':id/movements')
  findMovements(@Param('id') id: string) {
    return this.stockMovementsService.findAllByLotId(id);
  }

  @Post(':id/movements')
  createMovement(
    @Param('id') id: string,
    @Body()
    body: {
      type: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
      quantity: number;
      notes?: string;
    },
  ) {
    return this.stockMovementsService.create(id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.geneticLotsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; notes?: string },
  ) {
    return this.geneticLotsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.geneticLotsService.remove(id);
  }
}
