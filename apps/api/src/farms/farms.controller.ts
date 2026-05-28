import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FarmsService } from './farms.service';
import { CreateFarmDto, UpdateFarmDto } from '../common/dto';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('farms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('farms')
export class FarmsController {
  constructor(private farmsService: FarmsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.farmsService.findAll(user);
  }

  @Get(':farmId')
  @UseGuards(FarmAccessGuard)
  findOne(@Param('farmId') farmId: string, @CurrentUser() user: AuthUser) {
    return this.farmsService.findOne(farmId, user);
  }

  @Get(':farmId/stats')
  @UseGuards(FarmAccessGuard)
  getStats(@Param('farmId') farmId: string, @CurrentUser() user: AuthUser) {
    return this.farmsService.getStats(farmId, user);
  }

  @Post()
  create(@Body() dto: CreateFarmDto, @CurrentUser() user: AuthUser) {
    return this.farmsService.create(dto, user);
  }

  @Patch(':farmId')
  @UseGuards(FarmAccessGuard)
  update(
    @Param('farmId') farmId: string,
    @Body() dto: UpdateFarmDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.farmsService.update(farmId, dto, user);
  }

  @Delete(':farmId')
  @UseGuards(FarmAccessGuard)
  remove(@Param('farmId') farmId: string, @CurrentUser() user: AuthUser) {
    return this.farmsService.remove(farmId, user);
  }
}
