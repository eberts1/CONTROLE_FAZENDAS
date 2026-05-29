import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto } from '../common/dto';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/partners')
export class PartnersController {
  constructor(private partnersService: PartnersService) {}

  @Get()
  findAll(@Param('farmId') farmId: string) {
    return this.partnersService.findAll(farmId);
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
