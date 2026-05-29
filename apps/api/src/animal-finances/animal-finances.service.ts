import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnimalExpenseType,
  AnimalSaleType,
  AnimalStatus,
  PaymentCondition,
  Prisma,
  SaleAssetScope,
} from '@prisma/client';
import {
  AnimalExpenseDto,
  AnimalFinanceSummaryDto,
  AnimalSaleDto,
  AnimalSaleType as SharedAnimalSaleType,
  FarmEventDto,
  FarmEventSaleListItemDto,
  SaleAssetScope as SharedSaleAssetScope,
  applyQuotaSaleToOwnership,
  calculateExpenseAllocations,
  calculateSaleAllocations,
  calculateSaleTotalFromFormula,
  ownershipRequiresEvent,
  resolveAssetScope,
  resolveQuotaPercent,
  shouldApplyOwnershipTransfer,
  validateOwnershipShares,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { AuthUser } from '../common/decorators';
import {
  CreateAnimalExpenseDto,
  CreateAnimalSaleDto,
  UpdateAnimalExpenseDto,
  UpdateAnimalSaleDto,
} from '../common/dto';
import { AnimalOwnershipService } from '../animal-ownership/animal-ownership.service';
import { PartnersService } from '../partners/partners.service';
import { FarmFinancesService } from '../farm-finances/farm-finances.service';
import { decimalToNumber, toDecimal } from '../common/decimal.util';

type SaleWithAllocations = Prisma.AnimalSaleGetPayload<{
  include: {
    allocations: { include: { partner: true } };
    event: true;
    buyerPartner: true;
    animal: { select: { id: true; tag: true; name: true; status: true } };
  };
}>;

type ExpenseWithAllocations = Prisma.AnimalExpenseGetPayload<{
  include: { allocations: { include: { partner: true } } };
}>;

@Injectable()
export class AnimalFinancesService {
  constructor(
    private prisma: PrismaService,
    private ownershipService: AnimalOwnershipService,
    private partnersService: PartnersService,
    private farmFinances: FarmFinancesService,
  ) {}

  private saleToDto(sale: SaleWithAllocations): AnimalSaleDto {
    const dto: AnimalSaleDto = {
      id: sale.id,
      animalId: sale.animalId,
      farmId: sale.farmId,
      eventId: sale.eventId,
      type: sale.type as AnimalSaleDto['type'],
      assetScope: sale.assetScope as AnimalSaleDto['assetScope'],
      quotaPercent: decimalToNumber(sale.quotaPercent),
      applyOwnershipTransfer: sale.applyOwnershipTransfer,
      buyerPartnerId: sale.buyerPartnerId,
      sellerPartnerIds: sale.sellerPartnerIds ?? [],
      description: sale.description,
      totalAmount: decimalToNumber(sale.totalAmount) ?? 0,
      transactionDate: sale.transactionDate.toISOString(),
      commissionPercent: decimalToNumber(sale.commissionPercent),
      paymentCondition: sale.paymentCondition as AnimalSaleDto['paymentCondition'],
      unitValue: decimalToNumber(sale.unitValue),
      quantity: sale.quantity,
      captures: sale.captures,
      notes: sale.notes,
      createdById: sale.createdById,
      allocations: sale.allocations.map((a) => ({
        id: a.id,
        saleId: a.saleId,
        partnerId: a.partnerId,
        ownershipPercent: decimalToNumber(a.ownershipPercent) ?? 0,
        grossAmount: decimalToNumber(a.grossAmount) ?? 0,
        discountPercent: decimalToNumber(a.discountPercent),
        discountPercent2: decimalToNumber(a.discountPercent2),
        discountAmount: decimalToNumber(a.discountAmount) ?? 0,
        netAmount: decimalToNumber(a.netAmount) ?? 0,
        entryAmount: decimalToNumber(a.entryAmount),
        partner: this.partnersService.toDto(a.partner),
      })),
      createdAt: sale.createdAt.toISOString(),
      updatedAt: sale.updatedAt.toISOString(),
    };
    if (sale.event) {
      dto.event = this.eventToDto(sale.event);
    }
    if (sale.buyerPartner) {
      dto.buyerPartner = this.partnersService.toDto(sale.buyerPartner);
    }
    return dto;
  }

  private eventToDto(event: NonNullable<SaleWithAllocations['event']>): FarmEventDto {
    return {
      id: event.id,
      farmId: event.farmId,
      type: event.type as FarmEventDto['type'],
      status: event.status as FarmEventDto['status'],
      name: event.name,
      location: event.location,
      startDate: event.startDate?.toISOString() ?? null,
      endDate: event.endDate?.toISOString() ?? null,
      organizer: event.organizer,
      commissionPercent: decimalToNumber(event.commissionPercent),
      notes: event.notes,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  private saleToEventListItem(sale: SaleWithAllocations): FarmEventSaleListItemDto {
    const base = this.saleToDto(sale);
    if (!sale.animal) return base;
    return {
      ...base,
      animal: {
        id: sale.animal.id,
        tag: sale.animal.tag,
        name: sale.animal.name,
        status: sale.animal.status as NonNullable<FarmEventSaleListItemDto['animal']>['status'],
      },
    };
  }

  private expenseToDto(expense: ExpenseWithAllocations): AnimalExpenseDto {
    return {
      id: expense.id,
      animalId: expense.animalId,
      farmId: expense.farmId,
      eventId: expense.eventId,
      type: expense.type as AnimalExpenseDto['type'],
      description: expense.description,
      totalAmount: decimalToNumber(expense.totalAmount) ?? 0,
      expenseDate: expense.expenseDate.toISOString(),
      splitAmongPartners: expense.splitAmongPartners,
      notes: expense.notes,
      createdById: expense.createdById,
      allocations: expense.allocations.map((a) => ({
        id: a.id,
        expenseId: a.expenseId,
        partnerId: a.partnerId,
        ownershipPercent: decimalToNumber(a.ownershipPercent) ?? 0,
        allocatedAmount: decimalToNumber(a.allocatedAmount) ?? 0,
        partner: this.partnersService.toDto(a.partner),
      })),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private readonly saleInclude = {
    allocations: { include: { partner: true } },
    event: true,
    buyerPartner: true,
    animal: { select: { id: true, tag: true, name: true, status: true } },
  } satisfies Prisma.AnimalSaleInclude;

  private readonly expenseInclude = {
    allocations: { include: { partner: true } },
  } satisfies Prisma.AnimalExpenseInclude;

  private resolveSaleTotal(dto: CreateAnimalSaleDto | UpdateAnimalSaleDto): number {
    const fromFormula = calculateSaleTotalFromFormula(
      dto.quantity,
      dto.unitValue,
      dto.captures,
    );
    if (fromFormula != null) return fromFormula;
    if (dto.totalAmount == null) {
      throw new BadRequestException('Informe o valor total ou os campos da fórmula');
    }
    return dto.totalAmount;
  }

  async findSales(farmId: string, animalId: string) {
    await this.ownershipService.ensureAnimal(farmId, animalId);
    const sales = await this.prisma.animalSale.findMany({
      where: { animalId, farmId },
      include: this.saleInclude,
      orderBy: { transactionDate: 'desc' },
    });
    return sales.map((s) => this.saleToDto(s));
  }

  async findSalesByEvent(farmId: string, eventId: string): Promise<FarmEventSaleListItemDto[]> {
    const sales = await this.prisma.animalSale.findMany({
      where: { eventId, farmId },
      include: this.saleInclude,
      orderBy: { transactionDate: 'desc' },
    });
    return sales.map((s) => this.saleToEventListItem(s));
  }

  private async ensureEvent(farmId: string, eventId: string) {
    const event = await this.prisma.farmEvent.findFirst({
      where: { id: eventId, farmId },
    });
    if (!event) throw new BadRequestException('Evento não encontrado');
    if (event.status === 'CANCELADO') {
      throw new BadRequestException('Não é possível lançar em evento cancelado');
    }
    return event;
  }

  private async ensureBuyerPartner(farmId: string, buyerPartnerId: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id: buyerPartnerId, farmId },
    });
    if (!partner) throw new BadRequestException('Comprador (parceiro) não encontrado na fazenda');
  }

  async findSale(farmId: string, animalId: string, saleId: string) {
    const sale = await this.prisma.animalSale.findFirst({
      where: { id: saleId, animalId, farmId },
      include: this.saleInclude,
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');
    return this.saleToDto(sale);
  }

  async createSale(
    farmId: string,
    animalId: string,
    dto: CreateAnimalSaleDto,
    user: AuthUser,
  ) {
    await this.ownershipService.ensureAnimal(farmId, animalId);
    const saleType = dto.type as SharedAnimalSaleType;
    const assetScope = resolveAssetScope(
      saleType,
      dto.quotaPercent,
      dto.assetScope as SharedSaleAssetScope | undefined,
    );

    if (ownershipRequiresEvent(assetScope) && !dto.eventId) {
      throw new BadRequestException('Venda de cota ou animal inteiro exige um evento vinculado');
    }
    if (dto.eventId) await this.ensureEvent(farmId, dto.eventId);

    const applyTransfer = shouldApplyOwnershipTransfer(assetScope, dto.applyOwnershipTransfer);
    let quotaPercent: number | null = null;
    if (applyTransfer) {
      if (!dto.buyerPartnerId) {
        throw new BadRequestException('Informe o comprador para transferência de cotas');
      }
      await this.ensureBuyerPartner(farmId, dto.buyerPartnerId);
      try {
        quotaPercent = resolveQuotaPercent(assetScope, dto.quotaPercent);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Cota inválida',
        );
      }
    }

    const shares = await this.ownershipService.getSharesForAllocation(animalId);
    const totalAmount = this.resolveSaleTotal(dto);

    let allocations;
    try {
      allocations = calculateSaleAllocations(
        totalAmount,
        shares,
        dto.allocationOverrides ?? [],
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Rateio inválido',
      );
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.animalSale.create({
        data: {
          animalId,
          farmId,
          eventId: dto.eventId,
          type: dto.type as AnimalSaleType,
          assetScope: assetScope as SaleAssetScope,
          quotaPercent: quotaPercent != null ? toDecimal(quotaPercent) : undefined,
          applyOwnershipTransfer: applyTransfer,
          buyerPartnerId: dto.buyerPartnerId,
          sellerPartnerIds: dto.sellerPartnerIds ?? [],
          description: dto.description,
          totalAmount: toDecimal(totalAmount)!,
          transactionDate: new Date(dto.transactionDate),
          commissionPercent: toDecimal(dto.commissionPercent),
          paymentCondition: dto.paymentCondition as PaymentCondition | undefined,
          unitValue: toDecimal(dto.unitValue),
          quantity: dto.quantity,
          captures: dto.captures,
          notes: dto.notes,
          createdById: user.id,
          allocations: {
            create: allocations.map((a) => ({
              partnerId: a.partnerId,
              ownershipPercent: toDecimal(a.ownershipPercent)!,
              grossAmount: toDecimal(a.grossAmount)!,
              discountPercent: toDecimal(a.discountPercent),
              discountPercent2: toDecimal(a.discountPercent2),
              discountAmount: toDecimal(a.discountAmount)!,
              netAmount: toDecimal(a.netAmount)!,
              entryAmount: toDecimal(a.entryAmount),
            })),
          },
        },
      });

      if (applyTransfer && dto.buyerPartnerId && quotaPercent != null) {
        const current = await tx.animalOwnership.findMany({ where: { animalId } });
        const beforeSnapshot = current.map((o) => ({
          partnerId: o.partnerId,
          ownershipPercent: decimalToNumber(o.ownershipPercent) ?? 0,
          isPrimary: o.isPrimary,
        }));

        let afterShares;
        try {
          afterShares = applyQuotaSaleToOwnership(
            beforeSnapshot,
            quotaPercent,
            dto.buyerPartnerId,
            dto.sellerPartnerIds,
          );
          validateOwnershipShares(afterShares);
        } catch (error) {
          throw new BadRequestException(
            error instanceof Error ? error.message : 'Transferência de cotas inválida',
          );
        }

        await tx.animalOwnership.deleteMany({ where: { animalId } });
        await tx.animalOwnership.createMany({
          data: afterShares.map((share) => ({
            animalId,
            partnerId: share.partnerId,
            ownershipPercent: toDecimal(share.ownershipPercent)!,
            isPrimary: Boolean(share.isPrimary),
          })),
        });

        await tx.animalOwnershipHistory.create({
          data: {
            animalId,
            saleId: created.id,
            effectiveAt: new Date(dto.transactionDate),
            beforeSnapshot: beforeSnapshot as unknown as Prisma.InputJsonValue,
            afterSnapshot: afterShares as unknown as Prisma.InputJsonValue,
          },
        });

        if (quotaPercent >= 100 || assetScope === SaleAssetScope.ANIMAL_INTEIRO) {
          await tx.animal.update({
            where: { id: animalId },
            data: { status: AnimalStatus.VENDIDO },
          });
        }
      }

      await this.farmFinances.syncFromAnimalSale(created, tx);

      return tx.animalSale.findUniqueOrThrow({
        where: { id: created.id },
        include: this.saleInclude,
      });
    });

    return this.saleToDto(sale);
  }

  async updateSale(
    farmId: string,
    animalId: string,
    saleId: string,
    dto: UpdateAnimalSaleDto,
  ) {
    const existing = await this.prisma.animalSale.findFirst({
      where: { id: saleId, animalId, farmId },
    });
    if (!existing) throw new NotFoundException('Venda não encontrada');

    const merged = {
      type: dto.type ?? existing.type,
      description: dto.description ?? existing.description,
      totalAmount: dto.totalAmount ?? decimalToNumber(existing.totalAmount) ?? 0,
      transactionDate: dto.transactionDate ?? existing.transactionDate.toISOString(),
      commissionPercent:
        dto.commissionPercent ?? decimalToNumber(existing.commissionPercent) ?? undefined,
      paymentCondition: dto.paymentCondition ?? existing.paymentCondition ?? undefined,
      unitValue: dto.unitValue ?? decimalToNumber(existing.unitValue) ?? undefined,
      quantity: dto.quantity ?? existing.quantity ?? undefined,
      captures: dto.captures ?? existing.captures ?? undefined,
      notes: dto.notes !== undefined ? dto.notes : existing.notes ?? undefined,
      allocationOverrides: dto.allocationOverrides,
    };

    const totalAmount = this.resolveSaleTotal(merged);
    const shares = await this.ownershipService.getSharesForAllocation(animalId);

    let allocations;
    try {
      allocations = calculateSaleAllocations(
        totalAmount,
        shares,
        merged.allocationOverrides ?? [],
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Rateio inválido',
      );
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      await tx.animalSaleAllocation.deleteMany({ where: { saleId } });
      return tx.animalSale.update({
        where: { id: saleId },
        data: {
          type: merged.type as AnimalSaleType,
          description: merged.description,
          totalAmount: toDecimal(totalAmount)!,
          transactionDate: new Date(merged.transactionDate),
          commissionPercent: toDecimal(merged.commissionPercent),
          paymentCondition: merged.paymentCondition as PaymentCondition | undefined,
          unitValue: toDecimal(merged.unitValue),
          quantity: merged.quantity,
          captures: merged.captures,
          notes: merged.notes,
          allocations: {
            create: allocations.map((a) => ({
              partnerId: a.partnerId,
              ownershipPercent: toDecimal(a.ownershipPercent)!,
              grossAmount: toDecimal(a.grossAmount)!,
              discountPercent: toDecimal(a.discountPercent),
              discountPercent2: toDecimal(a.discountPercent2),
              discountAmount: toDecimal(a.discountAmount)!,
              netAmount: toDecimal(a.netAmount)!,
              entryAmount: toDecimal(a.entryAmount),
            })),
          },
        },
        include: this.saleInclude,
      });
    });

    return this.saleToDto(sale);
  }

  async removeSale(farmId: string, animalId: string, saleId: string) {
    await this.findSale(farmId, animalId, saleId);
    await this.prisma.animalSale.delete({ where: { id: saleId } });
    return { ok: true };
  }

  async findExpenses(farmId: string, animalId: string) {
    await this.ownershipService.ensureAnimal(farmId, animalId);
    const expenses = await this.prisma.animalExpense.findMany({
      where: { animalId, farmId },
      include: this.expenseInclude,
      orderBy: { expenseDate: 'desc' },
    });
    return expenses.map((e) => this.expenseToDto(e));
  }

  async findExpense(farmId: string, animalId: string, expenseId: string) {
    const expense = await this.prisma.animalExpense.findFirst({
      where: { id: expenseId, animalId, farmId },
      include: this.expenseInclude,
    });
    if (!expense) throw new NotFoundException('Despesa não encontrada');
    return this.expenseToDto(expense);
  }

  async createExpense(
    farmId: string,
    animalId: string,
    dto: CreateAnimalExpenseDto,
    user: AuthUser,
  ) {
    await this.ownershipService.ensureAnimal(farmId, animalId);
    const shares = await this.ownershipService.getSharesForAllocation(animalId);
    const splitAmongPartners = dto.splitAmongPartners ?? true;

    let allocations;
    try {
      allocations = calculateExpenseAllocations(
        dto.totalAmount,
        shares,
        splitAmongPartners,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Rateio inválido',
      );
    }

    if (dto.eventId) await this.ensureEvent(farmId, dto.eventId);

    const expense = await this.prisma.animalExpense.create({
      data: {
        animalId,
        farmId,
        eventId: dto.eventId,
        type: dto.type as AnimalExpenseType,
        description: dto.description,
        totalAmount: toDecimal(dto.totalAmount)!,
        expenseDate: new Date(dto.expenseDate),
        splitAmongPartners,
        notes: dto.notes,
        createdById: user.id,
        allocations: {
          create: allocations.map((a) => ({
            partnerId: a.partnerId,
            ownershipPercent: toDecimal(a.ownershipPercent)!,
            allocatedAmount: toDecimal(a.allocatedAmount)!,
          })),
        },
      },
      include: this.expenseInclude,
    });

    await this.farmFinances.syncFromAnimalExpense(expense);

    return this.expenseToDto(expense);
  }

  async updateExpense(
    farmId: string,
    animalId: string,
    expenseId: string,
    dto: UpdateAnimalExpenseDto,
  ) {
    const existing = await this.prisma.animalExpense.findFirst({
      where: { id: expenseId, animalId, farmId },
    });
    if (!existing) throw new NotFoundException('Despesa não encontrada');

    const totalAmount = dto.totalAmount ?? decimalToNumber(existing.totalAmount) ?? 0;
    const splitAmongPartners =
      dto.splitAmongPartners ?? existing.splitAmongPartners;
    const shares = await this.ownershipService.getSharesForAllocation(animalId);

    let allocations;
    try {
      allocations = calculateExpenseAllocations(
        totalAmount,
        shares,
        splitAmongPartners,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Rateio inválido',
      );
    }

    const expense = await this.prisma.$transaction(async (tx) => {
      await tx.animalExpenseAllocation.deleteMany({ where: { expenseId } });
      return tx.animalExpense.update({
        where: { id: expenseId },
        data: {
          type: (dto.type as AnimalExpenseType | undefined) ?? existing.type,
          description: dto.description ?? existing.description,
          totalAmount: toDecimal(totalAmount)!,
          expenseDate: dto.expenseDate
            ? new Date(dto.expenseDate)
            : existing.expenseDate,
          splitAmongPartners,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          allocations: {
            create: allocations.map((a) => ({
              partnerId: a.partnerId,
              ownershipPercent: toDecimal(a.ownershipPercent)!,
              allocatedAmount: toDecimal(a.allocatedAmount)!,
            })),
          },
        },
        include: this.expenseInclude,
      });
    });

    return this.expenseToDto(expense);
  }

  async removeExpense(farmId: string, animalId: string, expenseId: string) {
    await this.findExpense(farmId, animalId, expenseId);
    await this.prisma.animalExpense.delete({ where: { id: expenseId } });
    return { ok: true };
  }

  async getSummary(farmId: string, animalId: string): Promise<AnimalFinanceSummaryDto> {
    await this.ownershipService.ensureAnimal(farmId, animalId);

    const [sales, expenses] = await Promise.all([
      this.prisma.animalSale.findMany({
        where: { animalId, farmId },
        include: { allocations: { include: { partner: true } } },
      }),
      this.prisma.animalExpense.findMany({
        where: { animalId, farmId },
        include: { allocations: { include: { partner: true } } },
      }),
    ]);

    const totalSales = sales.reduce(
      (sum, s) => sum + (decimalToNumber(s.totalAmount) ?? 0),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (decimalToNumber(e.totalAmount) ?? 0),
      0,
    );

    const partnerMap = new Map<
      string,
      { partnerName: string; salesNet: number; expenses: number }
    >();

    for (const sale of sales) {
      for (const allocation of sale.allocations) {
        const current = partnerMap.get(allocation.partnerId) ?? {
          partnerName: allocation.partner.name,
          salesNet: 0,
          expenses: 0,
        };
        current.salesNet += decimalToNumber(allocation.netAmount) ?? 0;
        partnerMap.set(allocation.partnerId, current);
      }
    }

    for (const expense of expenses) {
      for (const allocation of expense.allocations) {
        const current = partnerMap.get(allocation.partnerId) ?? {
          partnerName: allocation.partner.name,
          salesNet: 0,
          expenses: 0,
        };
        current.expenses += decimalToNumber(allocation.allocatedAmount) ?? 0;
        partnerMap.set(allocation.partnerId, current);
      }
    }

    const byPartner = Array.from(partnerMap.entries()).map(([partnerId, data]) => ({
      partnerId,
      partnerName: data.partnerName,
      salesNet: data.salesNet,
      expenses: data.expenses,
      balance: data.salesNet - data.expenses,
    }));

    return {
      totalSales,
      totalExpenses,
      balance: totalSales - totalExpenses,
      byPartner,
    };
  }
}
