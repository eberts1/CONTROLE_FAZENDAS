import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GeneticMaterialType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateGeneticLotDto, UpdateGeneticLotDto } from '../common/dto';
import { AuthUser } from '../common/decorators';
import { AnimalsService } from '../animals/animals.service';
import { calculateBalance, EXPIRING_SOON_DAYS, LOW_STOCK_THRESHOLD } from './stock-balance.util';

@Injectable()
export class GeneticLotsService {
  constructor(private prisma: PrismaService, private animalsService: AnimalsService) {}

  private sortMovements<T extends { referenceDate: Date; createdAt: Date }>(movements: T[]) {
    return [...movements].sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
  }

  private toLotDto(lot: {
    id: string; farmId: string; sourceAnimalId: string; materialType: GeneticMaterialType; lotCode: string;
    collectedAt: Date | null; initialDoses: number; storageTank: string | null; storageCanister: string | null;
    storagePosition: string | null; laboratory: string | null; expiresAt: Date | null; notes: string | null;
    createdAt: Date; updatedAt: Date; sourceAnimal: { id: string; tag: string; name: string | null };
    movements: { type: StockMovementType; quantity: number; referenceDate: Date; createdAt: Date }[];
  }) {
    const sorted = this.sortMovements(lot.movements);
    const { movements: _, ...rest } = lot;
    return { ...rest, collectedAt: lot.collectedAt?.toISOString() ?? null, expiresAt: lot.expiresAt?.toISOString() ?? null, createdAt: lot.createdAt.toISOString(), updatedAt: lot.updatedAt.toISOString(), currentDoses: calculateBalance(sorted) };
  }

  async findAll(farmId: string, query: { materialType?: GeneticMaterialType; sourceAnimalId?: string; lowStock?: boolean } = {}) {
    const lots = await this.prisma.geneticLot.findMany({
      where: { farmId, ...(query.materialType && { materialType: query.materialType }), ...(query.sourceAnimalId && { sourceAnimalId: query.sourceAnimalId }) },
      include: { sourceAnimal: { select: { id: true, tag: true, name: true } }, movements: { select: { type: true, quantity: true, referenceDate: true, createdAt: true } } },
      orderBy: { lotCode: 'asc' },
    });
    const mapped = lots.map((lot) => this.toLotDto(lot));
    return query.lowStock ? mapped.filter((l) => l.currentDoses < LOW_STOCK_THRESHOLD) : mapped;
  }

  async findOne(farmId: string, id: string) {
    const lot = await this.prisma.geneticLot.findFirst({ where: { id, farmId }, include: { sourceAnimal: { select: { id: true, tag: true, name: true } }, movements: { select: { type: true, quantity: true, referenceDate: true, createdAt: true } } } });
    if (!lot) throw new NotFoundException('Lote não encontrado');
    return this.toLotDto(lot);
  }

  async create(farmId: string, dto: CreateGeneticLotDto, user: AuthUser) {
    await this.animalsService.findOne(farmId, dto.sourceAnimalId);
    try {
      const lot = await this.prisma.geneticLot.create({
        data: {
          farmId, sourceAnimalId: dto.sourceAnimalId, materialType: dto.materialType as GeneticMaterialType, lotCode: dto.lotCode,
          collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : null, initialDoses: dto.initialDoses,
          storageTank: dto.storageTank, storageCanister: dto.storageCanister, storagePosition: dto.storagePosition,
          laboratory: dto.laboratory, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, notes: dto.notes,
          movements: { create: { type: StockMovementType.ENTRADA, quantity: dto.initialDoses, reason: 'Cadastro do lote', referenceDate: dto.collectedAt ? new Date(dto.collectedAt) : new Date(), createdById: user.id } },
        },
        include: { sourceAnimal: { select: { id: true, tag: true, name: true } }, movements: { select: { type: true, quantity: true, referenceDate: true, createdAt: true } } },
      });
      return this.toLotDto(lot);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Já existe um lote com este código nesta fazenda');
      throw e;
    }
  }

  async update(farmId: string, id: string, dto: UpdateGeneticLotDto) {
    await this.findOne(farmId, id);
    if (dto.sourceAnimalId) await this.animalsService.findOne(farmId, dto.sourceAnimalId);
    try {
      const lot = await this.prisma.geneticLot.update({
        where: { id },
        data: {
          sourceAnimalId: dto.sourceAnimalId, materialType: dto.materialType as GeneticMaterialType | undefined, lotCode: dto.lotCode,
          collectedAt: dto.collectedAt !== undefined ? (dto.collectedAt ? new Date(dto.collectedAt) : null) : undefined,
          storageTank: dto.storageTank, storageCanister: dto.storageCanister, storagePosition: dto.storagePosition,
          laboratory: dto.laboratory, expiresAt: dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : undefined, notes: dto.notes,
        },
        include: { sourceAnimal: { select: { id: true, tag: true, name: true } }, movements: { select: { type: true, quantity: true, referenceDate: true, createdAt: true } } },
      });
      return this.toLotDto(lot);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Já existe um lote com este código nesta fazenda');
      throw e;
    }
  }

  async remove(farmId: string, id: string) { await this.findOne(farmId, id); return this.prisma.geneticLot.delete({ where: { id } }); }

  async getSummary(farmId: string) {
    const lots = await this.findAll(farmId);
    const now = new Date(); const expiringLimit = new Date(now); expiringLimit.setDate(expiringLimit.getDate() + EXPIRING_SOON_DAYS);
    let totalDoses = 0, semenDoses = 0, embryoDoses = 0, lowStockLots = 0, expiringSoonLots = 0;
    for (const lot of lots) {
      totalDoses += lot.currentDoses;
      if (lot.materialType === GeneticMaterialType.SEMEN) semenDoses += lot.currentDoses;
      if (lot.materialType === GeneticMaterialType.EMBRIAO) embryoDoses += lot.currentDoses;
      if (lot.currentDoses < LOW_STOCK_THRESHOLD) lowStockLots += 1;
      if (lot.expiresAt && new Date(lot.expiresAt) <= expiringLimit && new Date(lot.expiresAt) >= now) expiringSoonLots += 1;
    }
    return { totalDoses, semenDoses, embryoDoses, lowStockLots, expiringSoonLots };
  }

  async getLotEntity(farmId: string, lotId: string) {
    const lot = await this.prisma.geneticLot.findFirst({ where: { id: lotId, farmId }, include: { movements: { select: { type: true, quantity: true, referenceDate: true, createdAt: true } } } });
    if (!lot) throw new NotFoundException('Lote não encontrado');
    return lot;
  }

  async getCurrentBalance(farmId: string, lotId: string) {
    const lot = await this.getLotEntity(farmId, lotId);
    return calculateBalance(this.sortMovements(lot.movements));
  }
}
