import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';
import { KinshipService } from './kinship.service';

@ApiTags('kinship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/kinship')
export class KinshipController {
  constructor(private kinshipService: KinshipService) {}

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  search(@Param('farmId') farmId: string, @Query('q') q: string) {
    return this.kinshipService.search(farmId, q ?? '');
  }

  @Get('tree')
  @ApiQuery({ name: 'animalId', required: false })
  @ApiQuery({ name: 'genealogyKey', required: false })
  @ApiQuery({ name: 'depth', required: false, type: Number })
  getTree(
    @Param('farmId') farmId: string,
    @Query('animalId') animalId?: string,
    @Query('genealogyKey') genealogyKey?: string,
    @Query('depth') depth?: string,
  ) {
    const parsedDepth = depth != null ? Number(depth) : undefined;
    return this.kinshipService.getTree(farmId, {
      animalId,
      genealogyKey,
      depth: Number.isFinite(parsedDepth) ? parsedDepth : undefined,
    });
  }
}
