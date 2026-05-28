import { BadRequestException, Injectable } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateStockMovementDto } from '../common/dto';
import { AuthUser } from '../common/decorators';
import { GeneticLotsService } from './genetic-lots.service';
import { calculateBalance } from './stock-balance.util';

@Injectable()
export class StockMovementsService {
  constructor(private prisma: PrismaService, private geneticLotsService: GeneticLotsService) {}

  async findAll(farmId: string, lotId: string) {
    await this.geneticLotsService.getLotEntity(farmId, lotId);
    const movements = await this.prisma.stockMovement.findMany({
      where: { geneticLotId: lotId },
      orderBy: [{ referenceDate: 'desc' }, { createdAt: 'desc' }],
    });
    return movements.map((m) => ({ ...m, referenceDate: m.referenceDate.toISOString(), createdAt: m.createdAt.toISOString() }));
  }

  async create(farmId: string, lotId: string, dto: CreateStockMovementDto, user: AuthUser) {
    const lot = await this.geneticLotsService.getLotEntity(farmId, lotId);
    const sorted = [...lot.movements].sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
    const currentBalance = calculateBalance(sorted);
    const type = dto.type as StockMovementType;
    if (type === StockMovementType.SAIDA && currentBalance < dto.quantity) {
      throw new BadRequestException(`Saldo insuficiente. Disponível: ${currentBalance} dose(s)`);
    }
    if (type === StockMovementType.AJUSTE) {
      if (dto.quantity < 0) throw new BadRequestException('Saldo ajustado não pode ser negativo');
      if (dto.quantity === currentBalance) throw new BadRequestException('O saldo já está neste valor');
    }
    const movement = await this.prisma.stockMovement.create({
      data: { geneticLotId: lotId, type, quantity: dto.quantity, reason: dto.reason, referenceDate: new Date(dto.referenceDate), createdById: user.id },
    });
    return { ...movement, referenceDate: movement.referenceDate.toISOString(), createdAt: movement.createdAt.toISOString(), currentDoses: await this.geneticLotsService.getCurrentBalance(farmId, lotId) };
  }
}
