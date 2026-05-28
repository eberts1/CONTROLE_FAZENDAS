import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnimalsService } from './animals.service';
import { CreateAnimalDto, UpdateAnimalDto } from '../common/dto';
import { FarmAccessGuard, JwtAuthGuard } from '../common/guards';

@ApiTags('animals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FarmAccessGuard)
@Controller('farms/:farmId/animals')
export class AnimalsController {
  constructor(private animalsService: AnimalsService) {}

  @Get()
  findAll(@Param('farmId') farmId: string) {
    return this.animalsService.findAll(farmId);
  }

  @Get(':id/abcz-profile')
  async getAbczProfile(@Param('farmId') farmId: string, @Param('id') id: string) {
    const profile = await this.animalsService.getAbczProfile(farmId, id);
    if (!profile) throw new NotFoundException('Perfil ABCZ não encontrado para este animal');
    return profile;
  }

  @Get(':id')
  findOne(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.animalsService.findOne(farmId, id);
  }

  @Post()
  create(@Param('farmId') farmId: string, @Body() dto: CreateAnimalDto) {
    return this.animalsService.create(farmId, dto);
  }

  @Patch(':id')
  update(
    @Param('farmId') farmId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
  ) {
    return this.animalsService.update(farmId, id, dto);
  }

  @Post(':id/sync-abcz')
  syncAbcz(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.animalsService.syncAbczFromRemote(farmId, id);
  }

  @Delete(':id')
  remove(@Param('farmId') farmId: string, @Param('id') id: string) {
    return this.animalsService.remove(farmId, id);
  }
}
