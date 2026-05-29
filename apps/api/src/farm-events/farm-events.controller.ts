import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FarmEventsService } from './farm-events.service';
import { SaleMapImportService, UploadedPdfFile } from './sale-map-import.service';
import {
  CreateEventAnimalSaleDto,
  CreateFarmEventDto,
  ImportSaleMapDto,
  UpdateFarmEventDto,
} from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('farm-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/events')
export class FarmEventsController {
  constructor(
    private farmEventsService: FarmEventsService,
    private saleMapImportService: SaleMapImportService,
  ) {}

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

  @Post(':id/import/preview')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        password: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  previewImport(
    @Param('farmId') farmId: string,
    @Param('id') eventId: string,
    @UploadedFile() file: UploadedPdfFile,
    @Body('password') password?: string,
  ) {
    return this.saleMapImportService.previewFromPdf(farmId, eventId, file, password);
  }

  @Post(':id/import')
  importSaleMap(
    @Param('farmId') farmId: string,
    @Param('id') eventId: string,
    @Body() dto: ImportSaleMapDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.saleMapImportService.importLots(farmId, eventId, dto, user);
  }

  @Post(':id/import/sync-installments')
  syncInstallmentPlans(
    @Param('farmId') farmId: string,
    @Param('id') eventId: string,
    @Body() dto: ImportSaleMapDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.saleMapImportService.syncInstallmentPlans(farmId, eventId, dto, user);
  }
}
