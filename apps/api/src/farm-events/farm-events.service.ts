import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FarmEventDto,
  FarmEventSaleListItemDto,
  FarmEventSummaryDto,
} from '@controle-fazendas/shared';
import { FarmEventStatus, FarmEventType, Prisma } from '@prisma/client';
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

  async findAll(farmId: string): Promise<FarmEventDto[]> {
    const events = await this.prisma.farmEvent.findMany({
      where: { farmId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return events.map((e) => this.toDto(e));
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
    const [salesAgg, expensesAgg, salesCount, expensesCount] = await Promise.all([
      this.prisma.animalSale.aggregate({
        where: { eventId: id, farmId },
        _sum: { totalAmount: true },
      }),
      this.prisma.animalExpense.aggregate({
        where: { eventId: id, farmId },
        _sum: { totalAmount: true },
      }),
      this.prisma.animalSale.count({ where: { eventId: id, farmId } }),
      this.prisma.animalExpense.count({ where: { eventId: id, farmId } }),
    ]);

    const totalSales = decimalToNumber(salesAgg._sum?.totalAmount) ?? 0;
    const totalExpenses = decimalToNumber(expensesAgg._sum?.totalAmount) ?? 0;

    return {
      event,
      salesCount,
      totalSales,
      expensesCount,
      totalExpenses,
      balance: totalSales - totalExpenses,
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
