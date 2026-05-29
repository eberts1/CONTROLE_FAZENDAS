import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AdBannerContentType } from '@controle-fazendas/shared';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';
import { AdBannersService, UploadedBannerPhoto } from './ad-banners.service';
import { GenerateAdBannerDto } from './generate-ad-banner.dto';

interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@ApiTags('ad-banners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/ad-banners')
export class AdBannersController {
  constructor(private adBannersService: AdBannersService) {}

  @Post('generate')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        contentType: { type: 'string', enum: Object.values(AdBannerContentType) },
        damAnimalId: { type: 'string', format: 'uuid' },
        sireAnimalId: { type: 'string', format: 'uuid' },
        subtitle: { type: 'string' },
        aspectRatio: { type: 'string', enum: ['16:9', '4:5'] },
        photos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['contentType', 'photos'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('photos', 2, {
      limits: { fileSize: 7 * 1024 * 1024 },
    }),
  )
  generate(
    @Param('farmId') farmId: string,
    @Body() dto: GenerateAdBannerDto,
    @UploadedFiles() files: MulterFile[] | undefined,
  ) {
    const photos: UploadedBannerPhoto[] = (files ?? []).map((file) => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    }));

    return this.adBannersService.generate({
      farmId,
      contentType: dto.contentType,
      damAnimalId: dto.damAnimalId,
      sireAnimalId: dto.sireAnimalId,
      subtitle: dto.subtitle,
      aspectRatio: dto.aspectRatio,
      photos,
    });
  }
}
