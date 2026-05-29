import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SaleInstallmentsService } from './sale-installments.service';
import { CreateSaleInstallmentPlanDto, PayInstallmentDto } from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('sale-installments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/installments')
export class SaleInstallmentsController {
  constructor(private readonly service: SaleInstallmentsService) {}

  @Get('summary')
  getSummary(
    @Param('farmId') farmId: string,
    @Query('status') status?: string,
    @Query('eventId') eventId?: string,
    @Query('buyerPartnerId') buyerPartnerId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getSummary(farmId, { status, eventId, buyerPartnerId, search, from, to });
  }

  @Get()
  findAll(
    @Param('farmId') farmId: string,
    @Query('status') status?: string,
    @Query('eventId') eventId?: string,
    @Query('buyerPartnerId') buyerPartnerId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(farmId, { status, eventId, buyerPartnerId, search, from, to });
  }

  @Get('by-sale/:saleId')
  findBySale(@Param('farmId') farmId: string, @Param('saleId') saleId: string) {
    return this.service.findPlanBySale(farmId, saleId);
  }

  @Post('plans')
  createPlan(
    @Param('farmId') farmId: string,
    @Body() dto: CreateSaleInstallmentPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createPlan(farmId, dto, user);
  }

  @Patch(':id/pay')
  payInstallment(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: PayInstallmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.payInstallment(farmId, id, dto, user);
  }
}
