import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { abczLookupQuerySchema, abczPreviewQuerySchema } from '@controle-fazendas/shared';
import { JwtAuthGuard } from '../common/guards';
import { AbczLookupQueryDto, AbczPreviewQueryDto } from './abcz-query.dto';
import { AbczService } from './abcz.service';

@ApiTags('abcz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('abcz')
export class AbczController {
  constructor(private abczService: AbczService) {}

  @Get('lookup')
  lookup(@Query() query: AbczLookupQueryDto) {
    const parsed = abczLookupQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.abczService.lookup(parsed.data);
  }

  @Get('preview')
  preview(@Query() query: AbczPreviewQueryDto) {
    const parsed = abczPreviewQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.abczService.preview(parsed.data);
  }
}
