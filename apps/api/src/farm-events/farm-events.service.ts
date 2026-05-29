import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FarmEventDto,
  FarmEventListItemDto,
  FarmEventSaleListItemDto,
  FarmEventsExecutiveSummaryDto,
  FarmEventSummaryDto,
} from '@controle-fazendas/shared';
import {
  FarmEventStatus,
  FarmEventType,
  InstallmentStatus,
  LedgerEntryType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateFarmEventDto, CreateEventAnimalSaleDto, UpdateFarmEventDto } from '../common/dto';
import { AuthUser } from '../common/decorators';
import { decimalToNumber, toDecimal } from '../common/decimal.util';
import { AnimalFinancesService } from '../animal-finances/animal-finances.service';

@Injectable()
export class FarmEventsService {
  constructor(
    private prisma: PrismaService,
    private animalFinances: AnimalFinancesService,
  ) {}

  toDto(event: {
    id: string;
    farmId: string;
    type: FarmEventType;
    status: FarmEventStatus;
    name: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    organizer: string | null;
    commissionPercent: Prisma.Decimal | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): FarmEventDto {
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

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private async buildEventFinancials(farmId: string, eventIds: string[]) {
    const empty = {
      salesCount: 0,
      totalSales: 0,
      expensesCount: 0,
      totalExpenses: 0,
      totalReceived: 0,
      openReceivable: 0,
      balance: 0,
      auctionLotNumbers: [] as number[],
    };

    if (eventIds.length === 0) {
      return new Map<string, typeof empty>();
    }

    const [salesAggs, expenseAggs, paidInstallments, openInstallments, lotPlans] =
      await Promise.all([
        this.prisma.animalSale.groupBy({
          by: ['eventId'],
          where: { farmId, eventId: { in: eventIds } },
          _sum: { totalAmount: true },
          _count: true,
        }),
        this.prisma.farmLedgerEntry.groupBy({
          by: ['eventId'],
          where: { farmId, eventId: { in: eventIds }, type: LedgerEntryType.DESPESA },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.saleInstallment.findMany({
          where: {
            status: InstallmentStatus.PAGA,
            plan: { sale: { farmId, eventId: { in: eventIds } } },
          },
          select: {
            amount: true,
            paidAmount: true,
            plan: { select: { sale: { select: { eventId: true } } } },
          },
        }),
        this.prisma.saleInstallment.findMany({
          where: {
            status: InstallmentStatus.ABERTA,
            plan: { sale: { farmId, eventId: { in: eventIds } } },
          },
          select: {
            amount: true,
            plan: { select: { sale: { select: { eventId: true } } } },
          },
        }),
        this.prisma.saleInstallmentPlan.findMany({
          where: {
            auctionLotNumber: { not: null },
            sale: { farmId, eventId: { in: eventIds } },
          },
          select: {
            auctionLotNumber: true,
            sale: { select: { eventId: true } },
          },
        }),
      ]);

    const map = new Map<string, typeof empty>();
    for (const id of eventIds) {
      map.set(id, { ...empty, auctionLotNumbers: [] });
    }

    for (const row of salesAggs) {
      if (!row.eventId) continue;
      const entry = map.get(row.eventId);
      if (!entry) continue;
      entry.salesCount = row._count;
      entry.totalSales = decimalToNumber(row._sum.totalAmount) ?? 0;
    }

    for (const row of expenseAggs) {
      if (!row.eventId) continue;
      const entry = map.get(row.eventId);
      if (!entry) continue;
      entry.expensesCount = row._count;
      entry.totalExpenses = decimalToNumber(row._sum.amount) ?? 0;
    }

    for (const row of paidInstallments) {
      const eventId = row.plan.sale.eventId;
      if (!eventId) continue;
      const entry = map.get(eventId);
      if (!entry) continue;
      entry.totalReceived += decimalToNumber(row.paidAmount ?? row.amount) ?? 0;
    }

    for (const row of openInstallments) {
      const eventId = row.plan.sale.eventId;
      if (!eventId) continue;
      const entry = map.get(eventId);
      if (!entry) continue;
      entry.openReceivable += decimalToNumber(row.amount) ?? 0;
    }

    for (const row of lotPlans) {
      const eventId = row.sale.eventId;
      if (!eventId || row.auctionLotNumber == null) continue;
      const entry = map.get(eventId);
      if (!entry) continue;
      entry.auctionLotNumbers.push(row.auctionLotNumber);
    }

    for (const entry of map.values()) {
      entry.totalReceived = this.roundMoney(entry.totalReceived);
      entry.openReceivable = this.roundMoney(entry.openReceivable);
      entry.balance = this.roundMoney(entry.totalSales - entry.totalExpenses);
      entry.auctionLotNumbers = [...new Set(entry.auctionLotNumbers)].sort((a, b) => a - b);
    }

    return map;
  }

  async getExecutiveSummary(farmId: string): Promise<FarmEventsExecutiveSummaryDto> {
    const items = await this.findAll(farmId);
    const now = new Date();
    const in60Days = new Date(now);
    in60Days.setDate(in60Days.getDate() + 60);

    const statusCounts = new Map<FarmEventStatus, number>();
    for (const status of Object.values(FarmEventStatus)) {
      statusCounts.set(status, 0);
    }
    for (const item of items) {
      statusCounts.set(item.status as FarmEventStatus, (statusCounts.get(item.status as FarmEventStatus) ?? 0) + 1);
    }

    const activeStatuses = new Set<FarmEventStatus>([
      FarmEventStatus.PLANEJADO,
      FarmEventStatus.EM_ANDAMENTO,
    ]);

    let totalSales = 0;
    let totalExpenses = 0;
    let totalReceived = 0;
    let openReceivable = 0;

    for (const item of items) {
      totalSales += item.totalSales;
      totalExpenses += item.totalExpenses;
      totalReceived += item.totalReceived;
      openReceivable += item.openReceivable;
    }

    const balance = this.roundMoney(totalSales - totalExpenses);
    totalSales = this.roundMoney(totalSales);
    totalExpenses = this.roundMoney(totalExpenses);
    totalReceived = this.roundMoney(totalReceived);
    openReceivable = this.roundMoney(openReceivable);

    const collectionRate =
      totalSales > 0 ? this.roundMoney((totalReceived / totalSales) * 100) : 0;

    const topByRevenue = [...items]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        totalSales: item.totalSales,
        balance: item.balance,
      }));

    const upcoming = items
      .filter((item) => {
        if (!activeStatuses.has(item.status as FarmEventStatus)) return false;
        if (!item.startDate) return item.status === FarmEventStatus.PLANEJADO;
        const start = new Date(item.startDate);
        return start >= now && start <= in60Days;
      })
      .sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      })
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        startDate: item.startDate,
        totalSales: item.totalSales,
      }));

    const recentCompleted = items
      .filter((item) => item.status === FarmEventStatus.CONCLUIDO)
      .sort((a, b) => {
        const da = a.endDate ? new Date(a.endDate).getTime() : 0;
        const db = b.endDate ? new Date(b.endDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        name: item.name,
        endDate: item.endDate,
        totalSales: item.totalSales,
        balance: item.balance,
      }));

    return {
      byStatus: [...statusCounts.entries()].map(([status, count]) => ({
        status: status as FarmEventsExecutiveSummaryDto['byStatus'][0]['status'],
        count,
      })),
      totals: {
        eventCount: items.length,
        activeCount: items.filter((item) =>
          activeStatuses.has(item.status as FarmEventStatus),
        ).length,
        totalSales,
        totalExpenses,
        totalReceived,
        openReceivable,
        balance,
        collectionRate,
      },
      topByRevenue,
      upcoming,
      recentCompleted,
    };
  }

  async findAll(farmId: string): Promise<FarmEventListItemDto[]> {
    const events = await this.prisma.farmEvent.findMany({
      where: { farmId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    const financials = await this.buildEventFinancials(
      farmId,
      events.map((event) => event.id),
    );
    return events.map((event) => {
      const stats = financials.get(event.id)!;
      return {
        ...this.toDto(event),
        ...stats,
      };
    });
  }

  async findOne(farmId: string, id: string): Promise<FarmEventDto> {
    const event = await this.prisma.farmEvent.findFirst({
      where: { id, farmId },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return this.toDto(event);
  }

  async create(farmId: string, dto: CreateFarmEventDto): Promise<FarmEventDto> {
    const event = await this.prisma.farmEvent.create({
      data: {
        farmId,
        type: dto.type as FarmEventType,
        status: (dto.status as FarmEventStatus | undefined) ?? FarmEventStatus.PLANEJADO,
        name: dto.name,
        location: dto.location,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        organizer: dto.organizer,
        commissionPercent: toDecimal(dto.commissionPercent),
        notes: dto.notes,
      },
    });
    return this.toDto(event);
  }

  async update(farmId: string, id: string, dto: UpdateFarmEventDto): Promise<FarmEventDto> {
    await this.findOne(farmId, id);
    const event = await this.prisma.farmEvent.update({
      where: { id },
      data: {
        type: dto.type as FarmEventType | undefined,
        status: dto.status as FarmEventStatus | undefined,
        name: dto.name,
        location: dto.location,
        startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
        organizer: dto.organizer,
        commissionPercent:
          dto.commissionPercent !== undefined ? toDecimal(dto.commissionPercent) : undefined,
        notes: dto.notes,
      },
    });
    return this.toDto(event);
  }

  async remove(farmId: string, id: string) {
    await this.findOne(farmId, id);
    const salesCount = await this.prisma.animalSale.count({ where: { eventId: id } });
    if (salesCount > 0) {
      await this.prisma.farmEvent.update({
        where: { id },
        data: { status: FarmEventStatus.CANCELADO },
      });
      return { ok: true, cancelled: true };
    }
    await this.prisma.farmEvent.delete({ where: { id } });
    return { ok: true };
  }

  async getSummary(farmId: string, id: string): Promise<FarmEventSummaryDto> {
    const event = await this.findOne(farmId, id);
    const financials = await this.buildEventFinancials(farmId, [id]);
    const stats = financials.get(id)!;

    return {
      event,
      salesCount: stats.salesCount,
      totalSales: stats.totalSales,
      expensesCount: stats.expensesCount,
      totalExpenses: stats.totalExpenses,
      totalReceived: stats.totalReceived,
      openReceivable: stats.openReceivable,
      balance: stats.balance,
      auctionLotNumbers: stats.auctionLotNumbers,
    };
  }

  async findSales(farmId: string, eventId: string): Promise<FarmEventSaleListItemDto[]> {
    await this.findOne(farmId, eventId);
    return this.animalFinances.findSalesByEvent(farmId, eventId);
  }

  async createSale(
    farmId: string,
    eventId: string,
    dto: CreateEventAnimalSaleDto,
    user: AuthUser,
  ) {
    await this.findOne(farmId, eventId);
    const { animalId, ...saleDto } = dto;
    return this.animalFinances.createSale(
      farmId,
      animalId,
      { ...saleDto, eventId },
      user,
    );
  }
}
