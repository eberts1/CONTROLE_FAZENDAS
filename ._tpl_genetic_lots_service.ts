import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateBalance } from './stock-balance.util';

@Injectable()
export class GeneticLotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const lots = await this.prisma.geneticLot.findMany({
      include: { movements: true },
      orderBy: { createdAt: 'desc' },
    });
    return lots.map((lot) => ({
      ...lot,
      balance: calculateBalance(lot.movements ?? []),
    }));
  }

  async findOne(id: string) {
    const lot = await this.prisma.geneticLot.findUnique({
      where: { id },
      include: { movements: { orderBy: { createdAt: 'asc' } } },
    });
    if (!lot) throw new NotFoundException('Genetic lot not found');
    return {
      ...lot,
      balance: calculateBalance(lot.movements ?? []),
    };
  }

  async create(dto: {
    name: string;
    description?: string;
    initialQuantity: number;
    notes?: string;
  }) {
    if (dto.initialQuantity == null || dto.initialQuantity < 0) {
      throw new BadRequestException('initialQuantity must be a non-negative number');
    }
    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.geneticLot.create({
        data: {
          name: dto.name,
          description: dto.description,
          notes: dto.notes,
        },
      });
      if (dto.initialQuantity > 0) {
        await tx.geneticLotStockMovement.create({
          data: {
            geneticLotId: lot.id,
            type: 'ENTRADA',
            quantity: dto.initialQuantity,
            notes: dto.notes ?? 'Saldo inicial',
          },
        });
      }
      const withMovements = await tx.geneticLot.findUnique({
        where: { id: lot.id },
        include: { movements: true },
      });
      return {
        ...withMovements,
        balance: calculateBalance(withMovements?.movements ?? []),
      };
    });
  }

  async update(
    id: string,
    dto: { name?: string; description?: string; notes?: string },
  ) {
    await this.findOne(id);
    const lot = await this.prisma.geneticLot.update({
      where: { id },
      data: dto,
      include: { movements: true },
    });
    return {
      ...lot,
      balance: calculateBalance(lot.movements ?? []),
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.geneticLot.delete({ where: { id } });
  }

  async getSummary() {
    const lots = await this.prisma.geneticLot.findMany({
      include: { movements: true },
    });
    return lots.map((lot) => ({
      id: lot.id,
      name: lot.name,
      balance: calculateBalance(lot.movements ?? []),
    }));
  }
}
