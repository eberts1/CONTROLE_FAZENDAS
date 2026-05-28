import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CreateProcessRecordDto, UpdateProcessRecordDto } from '../common/dto';
import { AuthUser } from '../common/decorators';

@Injectable()
export class ProcessRecordsService {
  constructor(private prisma: PrismaService) {}

  findAll(farmId: string) {
    return this.prisma.processRecord.findMany({
      where: {
        OR: [{ process: { farmId } }, { area: { farmId } }],
      },
      include: { process: true, area: true },
      orderBy: { performedAt: 'desc' },
    });
  }

  async findOne(farmId: string, id: string) {
    const record = await this.prisma.processRecord.findFirst({
      where: {
        id,
        OR: [{ process: { farmId } }, { area: { farmId } }],
      },
      include: { process: true, area: true },
    });
    if (!record) throw new NotFoundException('Registro não encontrado');
    return record;
  }

  async create(farmId: string, dto: CreateProcessRecordDto, user: AuthUser) {
    await this.validateRelations(farmId, dto.processId, dto.areaId);

    return this.prisma.processRecord.create({
      data: {
        processId: dto.processId,
        areaId: dto.areaId,
        performedAt: new Date(dto.performedAt),
        notes: dto.notes,
        createdById: user.id,
      },
      include: { process: true, area: true },
    });
  }

  async update(farmId: string, id: string, dto: UpdateProcessRecordDto) {
    const existing = await this.findOne(farmId, id);

    if (dto.processId || dto.areaId) {
      await this.validateRelations(
        farmId,
        dto.processId ?? existing.processId,
        dto.areaId ?? existing.areaId,
      );
    }

    return this.prisma.processRecord.update({
      where: { id },
      data: {
        processId: dto.processId,
        areaId: dto.areaId,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        notes: dto.notes,
      },
      include: { process: true, area: true },
    });
  }

  async remove(farmId: string, id: string) {
    await this.findOne(farmId, id);
    return this.prisma.processRecord.delete({ where: { id } });
  }

  private async validateRelations(farmId: string, processId: string, areaId: string) {
    const [process, area] = await Promise.all([
      this.prisma.process.findFirst({ where: { id: processId, farmId } }),
      this.prisma.area.findFirst({ where: { id: areaId, farmId } }),
    ]);

    if (!process || !area) {
      throw new BadRequestException('Processo ou área inválidos para esta fazenda');
    }
  }
}
