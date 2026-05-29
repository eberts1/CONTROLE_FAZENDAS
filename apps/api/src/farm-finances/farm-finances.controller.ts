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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FarmFinancesService } from './farm-finances.service';
import {
  CreateEmployeeDto,
  CreateLedgerEntryDto,
  CreatePayrollLineDto,
  CreatePayrollRunDto,
  CreateRecurringTemplateDto,
  GenerateRecurringDto,
  UpdateEmployeeDto,
  UpdateLedgerEntryDto,
  UpdateRecurringTemplateDto,
} from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('farm-finances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/finances')
export class FarmFinancesController {
  constructor(private financesService: FarmFinancesService) {}

  @Get('summary')
  getSummary(
    @Param('farmId') farmId: string,
    @Query('section') section?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financesService.getSummary(farmId, { section, from, to });
  }

  @Get('ledger')
  findLedger(
    @Param('farmId') farmId: string,
    @Query('section') section?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financesService.findLedger(farmId, { section, type, from, to });
  }

  @Post('ledger')
  createLedger(
    @Param('farmId') farmId: string,
    @Body() dto: CreateLedgerEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.createLedger(farmId, dto, user);
  }

  @Patch('ledger/:id')
  updateLedger(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLedgerEntryDto,
  ) {
    return this.financesService.updateLedger(farmId, id, dto);
  }

  @Delete('ledger/:id')
  removeLedger(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.financesService.removeLedger(farmId, id);
  }

  @Get('recurring')
  findRecurring(@Param('farmId') farmId: string) {
    return this.financesService.findRecurring(farmId);
  }

  @Post('recurring')
  createRecurring(@Param('farmId') farmId: string, @Body() dto: CreateRecurringTemplateDto) {
    return this.financesService.createRecurring(farmId, dto);
  }

  @Patch('recurring/:id')
  updateRecurring(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringTemplateDto,
  ) {
    return this.financesService.updateRecurring(farmId, id, dto);
  }

  @Post('recurring/:id/generate')
  generateRecurring(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: GenerateRecurringDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.generateRecurring(farmId, id, dto, user);
  }

  @Get('employees')
  findEmployees(@Param('farmId') farmId: string) {
    return this.financesService.findEmployees(farmId);
  }

  @Post('employees')
  createEmployee(@Param('farmId') farmId: string, @Body() dto: CreateEmployeeDto) {
    return this.financesService.createEmployee(farmId, dto);
  }

  @Patch('employees/:id')
  updateEmployee(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.financesService.updateEmployee(farmId, id, dto);
  }

  @Get('payroll-runs')
  findPayrollRuns(@Param('farmId') farmId: string) {
    return this.financesService.findPayrollRuns(farmId);
  }

  @Post('payroll-runs')
  createPayrollRun(
    @Param('farmId') farmId: string,
    @Body() dto: CreatePayrollRunDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.createPayrollRun(farmId, dto, user);
  }

  @Post('payroll-runs/:id/lines')
  addPayrollLine(
    @Param('farmId') farmId: string,
    @Param('id') runId: string,
    @Body() dto: CreatePayrollLineDto,
  ) {
    return this.financesService.addPayrollLine(farmId, runId, dto);
  }

  @Post('payroll-runs/:id/close')
  closePayrollRun(
    @Param('farmId') farmId: string,
    @Param('id') runId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.closePayrollRun(farmId, runId, user);
  }

  @Post('payroll-runs/:id/mark-paid')
  markPayrollPaid(@Param('farmId') farmId: string, @Param('id') runId: string) {
    return this.financesService.markPayrollPaid(farmId, runId);
  }
}
