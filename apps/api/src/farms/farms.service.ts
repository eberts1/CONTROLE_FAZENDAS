import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateFarmDto, UpdateFarmDto } from '../common/dto';
import { AuthUser } from '../common/decorators';

@Injectable()
export class FarmsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    if (user.role === Role.ADMIN) {
      return this.prisma.farm.findMany({ orderBy: { name: 'asc' } });
    }

    const memberships = await this.prisma.farmUser.findMany({
      where: { userId: user.id },
      include: { farm: true },
    });

    return memberships.map((m) => m.farm);
  }

  async findOne(id: string, user: AuthUser) {
    await this.ensureAccess(id, user);
    const farm = await this.prisma.farm.findUnique({ where: { id } });
    if (!farm) throw new NotFoundException('Fazenda não encontrada');
    return farm;
  }

  async create(dto: CreateFarmDto, user: AuthUser) {
    if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
      throw new ForbiddenException('Permissão insuficiente');
    }

    const farm = await this.prisma.farm.create({ data: dto });

    await this.prisma.farmUser.create({
      data: {
        userId: user.id,
        farmId: farm.id,
        role: 'OWNER',
      },
    });

    return farm;
  }

  async update(id: string, dto: UpdateFarmDto, user: AuthUser) {
    await this.ensureAccess(id, user, true);
    return this.prisma.farm.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem excluir fazendas');
    }
    return this.prisma.farm.delete({ where: { id } });
  }

  async getStats(farmId: string, user: AuthUser) {
    await this.ensureAccess(farmId, user);

    const [areasCount, processesCount, recordsCount, recentRecords] = await Promise.all([
      this.prisma.area.count({ where: { farmId } }),
      this.prisma.process.count({ where: { farmId } }),
      this.prisma.processRecord.count({
        where: {
          OR: [
            { process: { farmId } },
            { area: { farmId } },
          ],
        },
      }),
      this.prisma.processRecord.findMany({
        where: {
          OR: [
            { process: { farmId } },
            { area: { farmId } },
          ],
        },
        include: { process: true, area: true },
        orderBy: { performedAt: 'desc' },
        take: 5,
      }),
    ]);

    return { areasCount, processesCount, recordsCount, recentRecords };
  }

  private async ensureAccess(farmId: string, user: AuthUser, requireManager = false) {
    if (user.role === Role.ADMIN) return;

    const membership = await this.prisma.farmUser.findUnique({
      where: { userId_farmId: { userId: user.id, farmId } },
    });

    if (!membership) {
      throw new ForbiddenException('Sem acesso a esta fazenda');
    }

    if (requireManager && membership.role === 'MEMBER' && user.role !== Role.MANAGER) {
      throw new ForbiddenException('Permissão insuficiente');
    }
  }
}
