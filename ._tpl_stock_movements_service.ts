import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeneticLotsService } from './genetic-lots.service';
import { calculateBalance } from './stock-balance.util';

export type StockMovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geneticLotsService: GeneticLotsService,
  ) {}

  async findAllByLotId(geneticLotId: string) {
    await this.geneticLotsService.findOne(geneticLotId);
    return this.prisma.geneticLotStockMovement.findMany({
      where: { geneticLotId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    geneticLotId: string,
    dto: { type: StockMovementType; quantity: number; notes?: string },
  ) {
    const lot = await this.geneticLotsService.findOne(geneticLotId);
    const { type, quantity, notes } = dto;

    if (quantity == null || Number.isNaN(Number(quantity))) {
      throw new BadRequestException('quantity is required');
    }

    const q = Number(quantity);
    const currentBalance = calculateBalance(lot.movements ?? []);

    if (type === 'ENTRADA') {
      if (q <= 0) {
        throw new BadRequestException('ENTRADA quantity must be positive');
      }
    } else if (type === 'SAIDA') {
      if (q <= 0) {
        throw new BadRequestException('SAIDA quantity must be positive');
      }
      if (q > currentBalance) {
        throw new BadRequestException('SAIDA exceeds current balance');
      }
    } else if (type === 'AJUSTE') {
      if (q < 0) {
        throw new BadRequestException('AJUSTE target balance must be non-negative');
      }
    } else {
      throw new BadRequestException('Invalid movement type');
    }

    return this.prisma.geneticLotStockMovement.create({
      data: {
        geneticLotId,
        type,
        quantity: q,
        notes,
      },
    });
  }
}
