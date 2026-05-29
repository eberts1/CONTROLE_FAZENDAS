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
import { AnimalFinancesService } from './animal-finances.service';
import {
  CreateAnimalExpenseDto,
  CreateAnimalSaleDto,
  UpdateAnimalExpenseDto,
  UpdateAnimalSaleDto,
} from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('animal-finances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/animals/:animalId')
export class AnimalFinancesController {
  constructor(private financesService: AnimalFinancesService) {}

  @Get('finance-summary')
  getSummary(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.financesService.getSummary(farmId, animalId);
  }

  @Get('sales')
  findSales(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.financesService.findSales(farmId, animalId);
  }

  @Get('sales/:saleId')
  findSale(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('saleId') saleId: string,
  ) {
    return this.financesService.findSale(farmId, animalId, saleId);
  }

  @Post('sales')
  createSale(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Body() dto: CreateAnimalSaleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.createSale(farmId, animalId, dto, user);
  }

  @Patch('sales/:saleId')
  updateSale(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('saleId') saleId: string,
    @Body() dto: UpdateAnimalSaleDto,
  ) {
    return this.financesService.updateSale(farmId, animalId, saleId, dto);
  }

  @Delete('sales/:saleId')
  removeSale(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('saleId') saleId: string,
  ) {
    return this.financesService.removeSale(farmId, animalId, saleId);
  }

  @Get('expenses')
  findExpenses(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.financesService.findExpenses(farmId, animalId);
  }

  @Get('expenses/:expenseId')
  findExpense(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.financesService.findExpense(farmId, animalId, expenseId);
  }

  @Post('expenses')
  createExpense(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Body() dto: CreateAnimalExpenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.createExpense(farmId, animalId, dto, user);
  }

  @Patch('expenses/:expenseId')
  updateExpense(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateAnimalExpenseDto,
  ) {
    return this.financesService.updateExpense(farmId, animalId, expenseId, dto);
  }

  @Delete('expenses/:expenseId')
  removeExpense(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.financesService.removeExpense(farmId, animalId, expenseId);
  }
}
