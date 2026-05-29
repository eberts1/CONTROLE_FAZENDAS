import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AnimalOwnershipDto,
  validateOwnershipShares,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { ReplaceAnimalOwnershipDto } from '../common/dto';
import { PartnersService } from '../partners/partners.service';
import { decimalToNumber, toDecimal } from '../common/decimal.util';

type OwnershipWithPartner = Prisma.AnimalOwnershipGetPayload<{
  include: { partner: true };
}>;

@Injectable()
export class AnimalOwnershipService {
  constructor(
    private prisma: PrismaService,
    private partnersService: PartnersService,
  ) {}

  private toDto(record: OwnershipWithPartner): AnimalOwnershipDto {
    return {
      id: record.id,
      animalId: record.animalId,
      partnerId: record.partnerId,
      ownershipPercent: decimalToNumber(record.ownershipPercent) ?? 0,
      isPrimary: record.isPrimary,
      partner: this.partnersService.toDto(record.partner),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private readonly ownershipInclude = {
    partner: true,
  } satisfies Prisma.AnimalOwnershipInclude;

  async ensureAnimal(farmId: string, animalId: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmId },
    });
    if (!animal) throw new NotFoundException('Animal não encontrado');
    return animal;
  }

  async findByAnimal(farmId: string, animalId: string) {
    await this.ensureAnimal(farmId, animalId);

    let records = await this.prisma.animalOwnership.findMany({
      where: { animalId },
      include: this.ownershipInclude,
      orderBy: [{ isPrimary: 'desc' }, { ownershipPercent: 'desc' }],
    });

    if (records.length === 0) {
      await this.initializeDefault(animalId, farmId);
      records = await this.prisma.animalOwnership.findMany({
        where: { animalId },
        include: this.ownershipInclude,
        orderBy: [{ isPrimary: 'desc' }, { ownershipPercent: 'desc' }],
      });
    }

    return records.map((r) => this.toDto(r));
  }

  async getSharesForAllocation(animalId: string) {
    const records = await this.prisma.animalOwnership.findMany({
      where: { animalId },
      include: { partner: true },
    });

    if (records.length === 0) {
      throw new BadRequestException('Animal sem proprietários definidos');
    }

    return records.map((r) => ({
      partnerId: r.partnerId,
      ownershipPercent: decimalToNumber(r.ownershipPercent) ?? 0,
      isPrimary: r.isPrimary,
    }));
  }

  async initializeDefault(animalId: string, farmId: string) {
    const existing = await this.prisma.animalOwnership.count({
      where: { animalId },
    });
    if (existing > 0) return;

    const farm = await this.prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
    });

    const partner = await this.partnersService.findOrCreateDefaultForFarm(
      farmId,
      farm.name,
    );

    await this.prisma.animalOwnership.create({
      data: {
        animalId,
        partnerId: partner.id,
        ownershipPercent: toDecimal(100)!,
        isPrimary: true,
      },
    });
  }

  async replace(farmId: string, animalId: string, dto: ReplaceAnimalOwnershipDto) {
    await this.ensureAnimal(farmId, animalId);

    const shares = dto.shares.map((s) => ({
      partnerId: s.partnerId,
      ownershipPercent: s.ownershipPercent,
      isPrimary: Boolean(s.isPrimary),
    }));

    try {
      validateOwnershipShares(shares);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Cotas inválidas',
      );
    }

    const partnerIds = shares.map((s) => s.partnerId);
    const partners = await this.prisma.partner.findMany({
      where: { farmId, id: { in: partnerIds } },
    });
    if (partners.length !== partnerIds.length) {
      throw new BadRequestException('Todos os parceiros devem pertencer à mesma fazenda');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.animalOwnership.deleteMany({ where: { animalId } });
      await tx.animalOwnership.createMany({
        data: shares.map((share) => ({
          animalId,
          partnerId: share.partnerId,
          ownershipPercent: toDecimal(share.ownershipPercent)!,
          isPrimary: share.isPrimary,
        })),
      });
    });

    return this.findByAnimal(farmId, animalId);
  }
}
