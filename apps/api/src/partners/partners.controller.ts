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
import { PartnersService } from './partners.service';
import { PartnerImportService, UploadedPdfFile } from './partner-import.service';
import {
  CreatePartnerDto,
  ImportPartnerBuyersDto,
  MergePartnersDto,
  UpdatePartnerDto,
} from '../common/dto';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/partners')
export class PartnersController {
  constructor(
    private partnersService: PartnersService,
    private partnerImportService: PartnerImportService,
  ) {}

  @Get()
  findAll(@Param('farmId') farmId: string) {
    return this.partnersService.findAll(farmId);
  }

  @Get('duplicates')
  findDuplicates(@Param('farmId') farmId: string) {
    return this.partnerImportService.findDuplicates(farmId);
  }

  @Post('import/preview')
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
    @UploadedFile() file: UploadedPdfFile,
    @Body('password') password?: string,
  ) {
    return this.partnerImportService.previewFromPdf(farmId, file, password);
  }

  @Post('import')
  importBuyers(
    @Param('farmId') farmId: string,
    @Body() dto: ImportPartnerBuyersDto,
  ) {
    return this.partnerImportService.importRows(farmId, dto);
  }

  @Post('merge')
  mergePartners(@Param('farmId') farmId: string, @Body() dto: MergePartnersDto) {
    return this.partnersService.mergePartners(farmId, dto.keepPartnerId, dto.mergePartnerIds);
  }

  @Get(':id/detail')
  getDetail(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.partnersService.getDetail(farmId, id);
  }

  @Get(':id')
  findOne(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.partnersService.findOne(farmId, id);
  }

  @Post()
  create(@Param('farmId') farmId: string, @Body() dto: CreatePartnerDto) {
    return this.partnersService.create(farmId, dto);
  }

  @Patch(':id')
  update(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return this.partnersService.update(farmId, id, dto);
  }

  @Delete(':id')
  remove(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.partnersService.remove(farmId, id);
  }
}
