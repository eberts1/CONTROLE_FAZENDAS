import { Injectable, NotFoundException } from '@nestjs/common';
import { ProcessCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateProcessDto, UpdateProcessDto } from '../common/dto';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  findAll(farmId: string) {
    return this.prisma.process.findMany({
      where: { farmId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(farmId: string, id: string) {
    const process = await this.prisma.process.findFirst({ where: { id, farmId } });
    if (!process) throw new NotFoundException('Processo não encontrado');
    return process;
  }

  create(farmId: string, dto: CreateProcessDto) {
    return this.prisma.process.create({
      data: {
        farmId,
        name: dto.name,
        category: dto.category as ProcessCategory,
        description: dto.description,
      },
    });
  }

  async update(farmId: string, id: string, dto: UpdateProcessDto) {
    await this.findOne(farmId, id);
    return this.prisma.process.update({
      where: { id },
      data: {
        ...dto,
        category: dto.category as ProcessCategory | undefined,
      },
    });
  }

  async remove(farmId: string, id: string) {
    await this.findOne(farmId, id);
    return this.prisma.process.delete({ where: { id } });
  }
}
