import { Injectable, NotFoundException } from '@nestjs/common';
import { AreaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateAreaDto, UpdateAreaDto } from '../common/dto';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  findAll(farmId: string) {
    return this.prisma.area.findMany({
      where: { farmId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(farmId: string, id: string) {
    const area = await this.prisma.area.findFirst({ where: { id, farmId } });
    if (!area) throw new NotFoundException('Área não encontrada');
    return area;
  }

  create(farmId: string, dto: CreateAreaDto) {
    return this.prisma.area.create({
      data: {
        farmId,
        name: dto.name,
        type: dto.type as AreaType,
        hectares: dto.hectares,
        description: dto.description,
      },
    });
  }

  async update(farmId: string, id: string, dto: UpdateAreaDto) {
    await this.findOne(farmId, id);
    return this.prisma.area.update({
      where: { id },
      data: {
        ...dto,
        type: dto.type as AreaType | undefined,
      },
    });
  }

  async remove(farmId: string, id: string) {
    await this.findOne(farmId, id);
    return this.prisma.area.delete({ where: { id } });
  }
}
