import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinanceSection,
  InstallmentStatus,
  LedgerCategory,
  LedgerEntryType,
  LedgerScope,
  LedgerSource,
  PaymentCondition,
  Prisma,
} from '@prisma/client';
import {
  InstallmentsSummaryDto,
  SaleInstallmentDto,
  SaleInstallmentListItemDto,
  SaleInstallmentPlanDto,
  mapAnimalSaleToLedgerMeta,
  validateInstallmentTotals,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { AuthUser } from '../common/decorators';
import { CreateSaleInstallmentPlanDto, PayInstallmentDto } from '../common/dto';
import { decimalToNumber, toDecimal } from '../common/decimal.util';

type InstallmentWithPlan = Prisma.SaleInstallmentGetPayload<{
  include: {
    plan: {
      include: {
        buyer: true;
        sale: {
          include: {
            animal: true;
            event: true;
          };
        };
      };
    };
  };
}>;

type InstallmentListFilters = {
  status?: string;
  eventId?: string;
  buyerPartnerId?: string;
  search?: string;
  from?: string;
  to?: string;
};

@Injectable()
export class SaleInstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private effectiveStatus(
    status: InstallmentStatus,
    dueDate: Date,
  ): SaleInstallmentDto['effectiveStatus'] {
    if (status === InstallmentStatus.PAGA) return 'PAGA';
    if (status === InstallmentStatus.CANCELADA) return 'CANCELADA';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today ? 'VENCIDA' : 'ABERTA';
  }

  private installmentToDto(row: {
    id: string;
    planId: string;
    sequence: number;
    label: string;
    amount: Prisma.Decimal;
    dueDate: Date;
    status: InstallmentStatus;
    paidAt: Date | null;
    paidAmount: Prisma.Decimal | null;
    paymentNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SaleInstallmentDto {
    return {
      id: row.id,
      planId: row.planId,
      sequence: row.sequence,
      label: row.label,
      amount: decimalToNumber(row.amount) ?? 0,
      dueDate: row.dueDate.toISOString(),
      status: row.status as SaleInstallmentDto['status'],
      effectiveStatus: this.effectiveStatus(row.status, row.dueDate),
      paidAt: row.paidAt?.toISOString() ?? null,
      paidAmount: decimalToNumber(row.paidAmount),
      paymentNotes: row.paymentNotes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private listItemToDto(row: InstallmentWithPlan): SaleInstallmentListItemDto {
    const base = this.installmentToDto(row);
    return {
      ...base,
      plan: {
        id: row.plan.id,
        saleId: row.plan.saleId,
        auctionLotNumber: row.plan.auctionLotNumber,
        netAmount: decimalToNumber(row.plan.netAmount) ?? 0,
        bidValue: decimalToNumber(row.plan.bidValue),
      },
      buyer: {
        id: row.plan.buyer.id,
        name: row.plan.buyer.name,
      },
      sale: {
        id: row.plan.sale.id,
        description: row.plan.sale.description,
        animalId: row.plan.sale.animalId,
        eventId: row.plan.sale.eventId,
        animalTag: row.plan.sale.animal?.tag ?? null,
        animalName: row.plan.sale.animal?.name ?? null,
        eventName: row.plan.sale.event?.name ?? null,
      },
    };
  }

  private planInclude = {
    installments: { orderBy: { sequence: 'asc' as const } },
    buyer: true,
  } satisfies Prisma.SaleInstallmentPlanInclude;

  private buildInstallmentWhere(
    farmId: string,
    filters: InstallmentListFilters,
  ): Prisma.SaleInstallmentWhereInput {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const searchTerm = filters.search?.trim();
    const planWhere: Prisma.SaleInstallmentPlanWhereInput = {
      ...(filters.buyerPartnerId ? { buyerPartnerId: filters.buyerPartnerId } : {}),
      sale: {
        farmId,
        ...(filters.eventId ? { eventId: filters.eventId } : {}),
      },
      ...(searchTerm
        ? {
            OR: [
              { buyer: { name: { contains: searchTerm, mode: 'insensitive' } } },
              { sale: { event: { name: { contains: searchTerm, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const where: Prisma.SaleInstallmentWhereInput = {
      plan: planWhere,
    };

    if (filters.from || filters.to) {
      where.dueDate = {};
      if (filters.from) where.dueDate.gte = new Date(filters.from);
      if (filters.to) where.dueDate.lte = new Date(filters.to);
    }

    if (filters.status === 'PAGA' || filters.status === 'CANCELADA') {
      where.status = filters.status as InstallmentStatus;
    } else if (filters.status === 'VENCIDA') {
      where.status = InstallmentStatus.ABERTA;
      where.dueDate = { ...(where.dueDate as Prisma.DateTimeFilter), lt: today };
    } else if (filters.status === 'ABERTA') {
      where.status = InstallmentStatus.ABERTA;
      where.dueDate = { ...(where.dueDate as Prisma.DateTimeFilter), gte: today };
    }

    return where;
  }

  private async createInstallmentLedger(
    tx: Prisma.TransactionClient,
    params: {
      farmId: string;
      installment: {
        id: string;
        label: string;
        amount: Prisma.Decimal;
        paidAt: Date | null;
        paidAmount: Prisma.Decimal | null;
        paymentNotes: string | null;
      };
      sale: {
        id: string;
        type: string;
        eventId: string | null;
        animalId: string;
        description: string;
      };
      buyerPartnerId: string;
      userId: string;
      paymentNotes?: string | null;
    },
  ) {
    const paidAmount = decimalToNumber(params.installment.paidAmount ?? params.installment.amount) ?? 0;
    const paidAt = params.installment.paidAt ?? new Date();
    const meta = mapAnimalSaleToLedgerMeta({
      type: params.sale.type as Parameters<typeof mapAnimalSaleToLedgerMeta>[0]['type'],
      eventId: params.sale.eventId,
      animalId: params.sale.animalId,
    });

    await tx.farmLedgerEntry.create({
      data: {
        farmId: params.farmId,
        section: meta.section as FinanceSection,
        type: meta.type as LedgerEntryType,
        category: meta.category as LedgerCategory,
        scope: meta.scope as LedgerScope,
        source: LedgerSource.PARCELA_VENDA,
        description: `${params.sale.description} — ${params.installment.label}`,
        amount: toDecimal(paidAmount)!,
        entryDate: paidAt,
        paidAt,
        eventId: meta.eventId,
        animalId: meta.animalId,
        partnerId: params.buyerPartnerId,
        saleInstallmentId: params.installment.id,
        notes: params.paymentNotes ?? params.installment.paymentNotes,
        createdById: params.userId,
      },
    });
  }

  async getSummary(farmId: string, filters: InstallmentListFilters = {}): Promise<InstallmentsSummaryDto> {
    const where = this.buildInstallmentWhere(farmId, filters);
    const rows = await this.prisma.saleInstallment.findMany({
      where,
      select: { amount: true, status: true, dueDate: true, paidAmount: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const summary: InstallmentsSummaryDto = {
      openCount: 0,
      openAmount: 0,
      overdueCount: 0,
      overdueAmount: 0,
      dueThisMonthCount: 0,
      dueThisMonthAmount: 0,
      paidCount: 0,
      paidAmount: 0,
    };

    for (const row of rows) {
      const amount = decimalToNumber(row.amount) ?? 0;
      if (row.status === InstallmentStatus.PAGA) {
        summary.paidCount += 1;
        summary.paidAmount += decimalToNumber(row.paidAmount) ?? amount;
        continue;
      }
      if (row.status === InstallmentStatus.CANCELADA) continue;

      summary.openCount += 1;
      summary.openAmount += amount;

      const due = new Date(row.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        summary.overdueCount += 1;
        summary.overdueAmount += amount;
      }
      if (due >= monthStart && due <= monthEnd) {
        summary.dueThisMonthCount += 1;
        summary.dueThisMonthAmount += amount;
      }
    }

    summary.openAmount = Math.round(summary.openAmount * 100) / 100;
    summary.overdueAmount = Math.round(summary.overdueAmount * 100) / 100;
    summary.dueThisMonthAmount = Math.round(summary.dueThisMonthAmount * 100) / 100;
    summary.paidAmount = Math.round(summary.paidAmount * 100) / 100;

    return summary;
  }

  async findAll(
    farmId: string,
    filters: InstallmentListFilters,
  ): Promise<SaleInstallmentListItemDto[]> {
    const where = this.buildInstallmentWhere(farmId, filters);

    const rows = await this.prisma.saleInstallment.findMany({
      where,
      include: {
        plan: {
          include: {
            buyer: true,
            sale: { include: { animal: true, event: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
    });

    return rows.map((row) => this.listItemToDto(row));
  }

  async findPlanBySale(farmId: string, saleId: string): Promise<SaleInstallmentPlanDto[]> {
    const sale = await this.prisma.animalSale.findFirst({ where: { id: saleId, farmId } });
    if (!sale) throw new NotFoundException('Venda não encontrada');

    const plans = await this.prisma.saleInstallmentPlan.findMany({
      where: { saleId },
      include: this.planInclude,
      orderBy: { createdAt: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      saleId: plan.saleId,
      allocationId: plan.allocationId,
      buyerPartnerId: plan.buyerPartnerId,
      auctionLotNumber: plan.auctionLotNumber,
      netAmount: decimalToNumber(plan.netAmount) ?? 0,
      bidValue: decimalToNumber(plan.bidValue),
      notes: plan.notes,
      installments: plan.installments.map((i) => this.installmentToDto(i)),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));
  }

  async createPlan(
    farmId: string,
    dto: CreateSaleInstallmentPlanDto,
    user: AuthUser,
    options?: { totalTolerance?: number },
  ): Promise<SaleInstallmentPlanDto> {
    const sale = await this.prisma.animalSale.findFirst({
      where: { id: dto.saleId, farmId },
      include: { allocations: true },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');

    const buyer = await this.prisma.partner.findFirst({
      where: { id: dto.buyerPartnerId, farmId },
    });
    if (!buyer) throw new NotFoundException('Comprador não encontrado');

    if (
      !validateInstallmentTotals(
        dto.netAmount,
        dto.installments.map((i) => ({ amount: i.amount })),
        options?.totalTolerance ?? 0.05,
      )
    ) {
      throw new BadRequestException(
        'A soma das parcelas não confere com o valor líquido da venda',
      );
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      if (sale.paymentCondition === PaymentCondition.PARCELADO) {
        await tx.farmLedgerEntry.deleteMany({ where: { animalSaleId: sale.id } });
      }

      const created = await tx.saleInstallmentPlan.create({
        data: {
          saleId: sale.id,
          allocationId: dto.allocationId,
          buyerPartnerId: dto.buyerPartnerId,
          auctionLotNumber: dto.auctionLotNumber ?? sale.auctionLotNumber ?? undefined,
          netAmount: toDecimal(dto.netAmount)!,
          bidValue: toDecimal(dto.bidValue ?? decimalToNumber(sale.unitValue) ?? undefined),
          notes: dto.notes,
          installments: {
            create: dto.installments.map((row) => {
              const cashPaid =
                row.sequence === 0 &&
                dto.installments.length === 1 &&
                Math.abs(row.amount - dto.netAmount) < 0.01;
              const isPaid = row.markAsPaid === true || cashPaid;
              return {
                sequence: row.sequence,
                label: row.label,
                amount: toDecimal(row.amount)!,
                dueDate: new Date(row.dueDate),
                status: isPaid ? InstallmentStatus.PAGA : InstallmentStatus.ABERTA,
                paidAt: isPaid ? new Date(row.paidAt ?? row.dueDate) : undefined,
                paidAmount: isPaid ? toDecimal(row.amount) : undefined,
              };
            }),
          },
        },
        include: {
          installments: { orderBy: { sequence: 'asc' } },
          buyer: true,
        },
      });

      const saleRecord = await tx.animalSale.findUniqueOrThrow({ where: { id: sale.id } });

      if (dto.auctionLotNumber != null || sale.paymentCondition !== PaymentCondition.PARCELADO) {
        await tx.animalSale.update({
          where: { id: sale.id },
          data: {
            auctionLotNumber: dto.auctionLotNumber ?? sale.auctionLotNumber ?? undefined,
            paymentCondition: PaymentCondition.PARCELADO,
          },
        });
      }

      for (const installment of created.installments) {
        if (installment.status !== InstallmentStatus.PAGA) continue;
        await this.createInstallmentLedger(tx, {
          farmId,
          installment,
          sale: saleRecord,
          buyerPartnerId: dto.buyerPartnerId,
          userId: user.id,
        });
      }

      return tx.saleInstallmentPlan.findUniqueOrThrow({
        where: { id: created.id },
        include: this.planInclude,
      });
    });

    return {
      id: plan.id,
      saleId: plan.saleId,
      allocationId: plan.allocationId,
      buyerPartnerId: plan.buyerPartnerId,
      auctionLotNumber: plan.auctionLotNumber,
      netAmount: decimalToNumber(plan.netAmount) ?? 0,
      bidValue: decimalToNumber(plan.bidValue),
      notes: plan.notes,
      installments: plan.installments.map((i) => this.installmentToDto(i)),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  async payInstallment(
    farmId: string,
    installmentId: string,
    dto: PayInstallmentDto,
    user: AuthUser,
  ): Promise<SaleInstallmentListItemDto> {
    const installment = await this.prisma.saleInstallment.findFirst({
      where: { id: installmentId, plan: { sale: { farmId } } },
      include: {
        plan: {
          include: {
            buyer: true,
            sale: { include: { animal: true, event: true } },
          },
        },
      },
    });

    if (!installment) throw new NotFoundException('Parcela não encontrada');
    if (installment.status === InstallmentStatus.PAGA) {
      throw new BadRequestException('Parcela já está paga');
    }
    if (installment.status === InstallmentStatus.CANCELADA) {
      throw new BadRequestException('Parcela cancelada não pode ser baixada');
    }

    const paidAmount = dto.paidAmount ?? decimalToNumber(installment.amount) ?? 0;
    const paidAt = new Date(dto.paidAt);
    const sale = installment.plan.sale;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.saleInstallment.update({
        where: { id: installmentId },
        data: {
          status: InstallmentStatus.PAGA,
          paidAt,
          paidAmount: toDecimal(paidAmount),
          paymentNotes: dto.paymentNotes,
        },
        include: {
          plan: {
            include: {
              buyer: true,
              sale: { include: { animal: true, event: true } },
            },
          },
        },
      });

      await this.createInstallmentLedger(tx, {
        farmId,
        installment: row,
        sale: row.plan.sale,
        buyerPartnerId: row.plan.buyerPartnerId,
        userId: user.id,
        paymentNotes: dto.paymentNotes,
      });

      return row;
    });

    return this.listItemToDto(updated);
  }
}
