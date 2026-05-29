import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinanceSection,
  LedgerCategory,
  LedgerEntryType,
  LedgerScope,
  LedgerSource,
  PaymentCondition,
  PayrollRunStatus,
  Prisma,
  RecurrenceFrequency,
} from '@prisma/client';
import {
  EmployeeDto,
  FarmFinanceByAreaSummaryDto,
  FarmFinanceSummaryDto,
  FarmFinanceTrendsDto,
  FarmLedgerEntryDto,
  mapAnimalExpenseToLedgerMeta,
  mapAnimalSaleToLedgerMeta,
  PayrollRunDto,
  RecurringLedgerTemplateDto,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { AuthUser } from '../common/decorators';
import {
  CreateEmployeeDto,
  CreateLedgerEntryDto,
  CreatePayrollLineDto,
  CreatePayrollRunDto,
  CreateRecurringTemplateDto,
  GenerateRecurringDto,
  UpdateEmployeeDto,
  UpdateLedgerEntryDto,
  UpdateRecurringTemplateDto,
} from '../common/dto';
import { decimalToNumber, toDecimal } from '../common/decimal.util';

@Injectable()
export class FarmFinancesService {
  constructor(private prisma: PrismaService) {}

  private ledgerToDto(
    row: {
      id: string;
      farmId: string;
      section: FinanceSection;
      type: LedgerEntryType;
      category: LedgerCategory;
      scope: LedgerScope;
      source: LedgerSource;
      description: string;
      amount: Prisma.Decimal;
      entryDate: Date;
      dueDate: Date | null;
      paidAt: Date | null;
      eventId: string | null;
      animalId: string | null;
      areaId: string | null;
      employeeId: string | null;
      partnerId: string | null;
      animalSaleId: string | null;
      animalExpenseId: string | null;
      saleInstallmentId: string | null;
      recurringTemplateId: string | null;
      payrollRunId: string | null;
      notes: string | null;
      createdById: string;
      createdAt: Date;
      updatedAt: Date;
    },
    event?: { id: string; name: string; type: string; status: string } | null,
  ): FarmLedgerEntryDto {
    return {
      id: row.id,
      farmId: row.farmId,
      section: row.section as FarmLedgerEntryDto['section'],
      type: row.type as FarmLedgerEntryDto['type'],
      category: row.category as FarmLedgerEntryDto['category'],
      scope: row.scope as FarmLedgerEntryDto['scope'],
      source: row.source as FarmLedgerEntryDto['source'],
      description: row.description,
      amount: decimalToNumber(row.amount) ?? 0,
      entryDate: row.entryDate.toISOString(),
      dueDate: row.dueDate?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      eventId: row.eventId,
      animalId: row.animalId,
      areaId: row.areaId,
      employeeId: row.employeeId,
      partnerId: row.partnerId,
      animalSaleId: row.animalSaleId,
      animalExpenseId: row.animalExpenseId,
      saleInstallmentId: row.saleInstallmentId,
      recurringTemplateId: row.recurringTemplateId,
      payrollRunId: row.payrollRunId,
      notes: row.notes,
      createdById: row.createdById,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      ...(event
        ? {
            event: {
              id: event.id,
              name: event.name,
              type: event.type as NonNullable<FarmLedgerEntryDto['event']>['type'],
              status: event.status as NonNullable<FarmLedgerEntryDto['event']>['status'],
            },
          }
        : {}),
    };
  }

  private async ensureEvent(farmId: string, eventId: string) {
    const event = await this.prisma.farmEvent.findFirst({
      where: { id: eventId, farmId },
    });
    if (!event) throw new BadRequestException('Evento não encontrado');
    return event;
  }

  private resolveLedgerScope(dto: CreateLedgerEntryDto | UpdateLedgerEntryDto): LedgerScope | undefined {
    if (dto.scope) return dto.scope as LedgerScope;
    if (dto.eventId && dto.animalId) return LedgerScope.ANIMAL_EVENTO;
    if (dto.eventId) return LedgerScope.EVENTO;
    if (dto.animalId) return LedgerScope.ANIMAL;
    if (dto.areaId) return LedgerScope.AREA;
    if (dto.employeeId) return LedgerScope.FUNCIONARIO;
    return undefined;
  }

  private employeeToDto(row: {
    id: string;
    farmId: string;
    name: string;
    document: string | null;
    role: string | null;
    baseSalary: Prisma.Decimal | null;
    admissionDate: Date | null;
    active: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): EmployeeDto {
    return {
      id: row.id,
      farmId: row.farmId,
      name: row.name,
      document: row.document,
      role: row.role,
      baseSalary: decimalToNumber(row.baseSalary),
      admissionDate: row.admissionDate?.toISOString() ?? null,
      active: row.active,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseMonth(referenceMonth: string): Date {
    const [year, month] = referenceMonth.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
  }

  private monthRange(referenceMonth?: string, from?: string, to?: string) {
    const now = new Date();
    const start = from
      ? new Date(from)
      : referenceMonth
        ? this.parseMonth(referenceMonth)
        : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to
      ? new Date(to)
      : referenceMonth
        ? new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  async getSummary(
    farmId: string,
    query: { section?: string; from?: string; to?: string },
  ): Promise<FarmFinanceSummaryDto> {
    const { start, end } = this.monthRange(undefined, query.from, query.to);
    const where: Prisma.FarmLedgerEntryWhereInput = {
      farmId,
      entryDate: { gte: start, lte: end },
      ...(query.section ? { section: query.section as FinanceSection } : {}),
    };

    const entries = await this.prisma.farmLedgerEntry.findMany({ where });
    let totalRevenue = 0;
    let totalExpense = 0;
    const sectionMap = new Map<string, { revenue: number; expense: number }>();

    for (const entry of entries) {
      const amount = decimalToNumber(entry.amount) ?? 0;
      const bucket = sectionMap.get(entry.section) ?? { revenue: 0, expense: 0 };
      if (entry.type === LedgerEntryType.RECEITA) {
        totalRevenue += amount;
        bucket.revenue += amount;
      } else {
        totalExpense += amount;
        bucket.expense += amount;
      }
      sectionMap.set(entry.section, bucket);
    }

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      totalRevenue,
      totalExpense,
      balance: totalRevenue - totalExpense,
      bySection: [...sectionMap.entries()].map(([section, v]) => ({
        section: section as FarmFinanceSummaryDto['bySection'][0]['section'],
        revenue: v.revenue,
        expense: v.expense,
        balance: v.revenue - v.expense,
      })),
    };
  }

  async getSummaryByArea(
    farmId: string,
    query: { from?: string; to?: string },
  ): Promise<FarmFinanceByAreaSummaryDto> {
    const { start, end } = this.monthRange(undefined, query.from, query.to);
    const entries = await this.prisma.farmLedgerEntry.findMany({
      where: { farmId, entryDate: { gte: start, lte: end } },
      select: { areaId: true, type: true, amount: true },
    });

    const areaMap = new Map<string | null, { revenue: number; expense: number }>();
    for (const entry of entries) {
      const key = entry.areaId;
      const bucket = areaMap.get(key) ?? { revenue: 0, expense: 0 };
      const amount = decimalToNumber(entry.amount) ?? 0;
      if (entry.type === LedgerEntryType.RECEITA) {
        bucket.revenue += amount;
      } else {
        bucket.expense += amount;
      }
      areaMap.set(key, bucket);
    }

    const areaIds = [...areaMap.keys()].filter((id): id is string => id !== null);
    const areas = areaIds.length
      ? await this.prisma.area.findMany({
          where: { farmId, id: { in: areaIds } },
          select: { id: true, name: true },
        })
      : [];
    const areaNames = new Map(areas.map((a) => [a.id, a.name]));

    const byArea = [...areaMap.entries()]
      .map(([areaId, v]) => ({
        areaId,
        areaName: areaId ? (areaNames.get(areaId) ?? 'Área') : 'Sem área',
        revenue: v.revenue,
        expense: v.expense,
        balance: v.revenue - v.expense,
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      byArea,
    };
  }

  async getTrends(farmId: string, months: number): Promise<FarmFinanceTrendsDto> {
    const count = Math.min(Math.max(months, 1), 24);
    const now = new Date();
    const points: FarmFinanceTrendsDto['points'] = [];

    for (let i = count - 1; i >= 0; i -= 1) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
      const month = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;

      const entries = await this.prisma.farmLedgerEntry.findMany({
        where: { farmId, entryDate: { gte: start, lte: end } },
        select: { type: true, amount: true },
      });

      let totalRevenue = 0;
      let totalExpense = 0;
      for (const entry of entries) {
        const amount = decimalToNumber(entry.amount) ?? 0;
        if (entry.type === LedgerEntryType.RECEITA) totalRevenue += amount;
        else totalExpense += amount;
      }

      points.push({
        month,
        from: start.toISOString(),
        to: end.toISOString(),
        totalRevenue,
        totalExpense,
        balance: totalRevenue - totalExpense,
      });
    }

    return { months: count, points };
  }

  async findLedger(
    farmId: string,
    query: {
      section?: string;
      type?: string;
      eventId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const { start, end } = this.monthRange(undefined, query.from, query.to);
    const rows = await this.prisma.farmLedgerEntry.findMany({
      where: {
        farmId,
        ...(!query.eventId ? { entryDate: { gte: start, lte: end } } : {}),
        ...(query.section ? { section: query.section as FinanceSection } : {}),
        ...(query.type ? { type: query.type as LedgerEntryType } : {}),
        ...(query.eventId ? { eventId: query.eventId } : {}),
      },
      include: { event: { select: { id: true, name: true, type: true, status: true } } },
      orderBy: { entryDate: 'desc' },
    });
    return rows.map((r) => this.ledgerToDto(r, r.event));
  }

  async createLedger(farmId: string, dto: CreateLedgerEntryDto, user: AuthUser) {
    if (dto.eventId) await this.ensureEvent(farmId, dto.eventId);
    const scope = this.resolveLedgerScope(dto) ?? LedgerScope.FAZENDA;
    const row = await this.prisma.farmLedgerEntry.create({
      data: {
        farmId,
        section: dto.section as FinanceSection,
        type: dto.type as LedgerEntryType,
        category: dto.category as LedgerCategory,
        scope,
        source: LedgerSource.MANUAL,
        description: dto.description,
        amount: toDecimal(dto.amount)!,
        entryDate: new Date(dto.entryDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        eventId: dto.eventId,
        animalId: dto.animalId,
        areaId: dto.areaId,
        employeeId: dto.employeeId,
        partnerId: dto.partnerId,
        notes: dto.notes,
        createdById: user.id,
      },
      include: { event: { select: { id: true, name: true, type: true, status: true } } },
    });
    return this.ledgerToDto(row, row.event);
  }

  async updateLedger(farmId: string, id: string, dto: UpdateLedgerEntryDto) {
    const existing = await this.prisma.farmLedgerEntry.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Lançamento não encontrado');
    if (existing.source !== LedgerSource.MANUAL) {
      throw new BadRequestException('Somente lançamentos manuais podem ser editados');
    }
    if (dto.eventId) await this.ensureEvent(farmId, dto.eventId);
    const scope =
      this.resolveLedgerScope({
        scope: dto.scope,
        eventId: dto.eventId ?? existing.eventId ?? undefined,
        animalId: dto.animalId ?? existing.animalId ?? undefined,
        areaId: dto.areaId ?? existing.areaId ?? undefined,
        employeeId: dto.employeeId ?? existing.employeeId ?? undefined,
      }) ?? existing.scope;
    const row = await this.prisma.farmLedgerEntry.update({
      where: { id },
      data: {
        section: dto.section as FinanceSection | undefined,
        type: dto.type as LedgerEntryType | undefined,
        category: dto.category as LedgerCategory | undefined,
        scope: dto.scope != null || dto.eventId != null ? scope : undefined,
        description: dto.description,
        amount: dto.amount != null ? toDecimal(dto.amount)! : undefined,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
        paidAt: dto.paidAt !== undefined ? (dto.paidAt ? new Date(dto.paidAt) : null) : undefined,
        eventId: dto.eventId,
        animalId: dto.animalId,
        areaId: dto.areaId,
        employeeId: dto.employeeId,
        partnerId: dto.partnerId,
        notes: dto.notes,
      },
      include: { event: { select: { id: true, name: true, type: true, status: true } } },
    });
    return this.ledgerToDto(row, row.event);
  }

  async removeLedger(farmId: string, id: string) {
    const existing = await this.prisma.farmLedgerEntry.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Lançamento não encontrado');
    if (existing.source !== LedgerSource.MANUAL) {
      throw new BadRequestException('Lançamentos automáticos não podem ser excluídos aqui');
    }
    await this.prisma.farmLedgerEntry.delete({ where: { id } });
    return { ok: true };
  }

  async syncFromAnimalSale(
    sale: {
      id: string;
      farmId: string;
      animalId: string;
      type: string;
      eventId: string | null;
      description: string;
      totalAmount: Prisma.Decimal;
      transactionDate: Date;
      notes: string | null;
      createdById: string;
      paymentCondition?: PaymentCondition | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (sale.paymentCondition === PaymentCondition.PARCELADO) {
      return;
    }
    const db = tx ?? this.prisma;
    const meta = mapAnimalSaleToLedgerMeta({
      type: sale.type as Parameters<typeof mapAnimalSaleToLedgerMeta>[0]['type'],
      eventId: sale.eventId,
      animalId: sale.animalId,
    });
    await db.farmLedgerEntry.upsert({
      where: { animalSaleId: sale.id },
      create: {
        farmId: sale.farmId,
        section: meta.section as FinanceSection,
        type: meta.type as LedgerEntryType,
        category: meta.category as LedgerCategory,
        scope: meta.scope as LedgerScope,
        source: LedgerSource.ANIMAL_SALE,
        description: sale.description,
        amount: sale.totalAmount,
        entryDate: sale.transactionDate,
        eventId: meta.eventId,
        animalId: meta.animalId,
        animalSaleId: sale.id,
        notes: sale.notes,
        createdById: sale.createdById,
      },
      update: {
        description: sale.description,
        amount: sale.totalAmount,
        entryDate: sale.transactionDate,
        notes: sale.notes,
      },
    });
  }

  async syncFromAnimalExpense(
    expense: {
      id: string;
      farmId: string;
      animalId: string;
      type: string;
      eventId: string | null;
      description: string;
      totalAmount: Prisma.Decimal;
      expenseDate: Date;
      notes: string | null;
      createdById: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const meta = mapAnimalExpenseToLedgerMeta({
      type: expense.type as Parameters<typeof mapAnimalExpenseToLedgerMeta>[0]['type'],
      eventId: expense.eventId,
      animalId: expense.animalId,
    });
    await db.farmLedgerEntry.upsert({
      where: { animalExpenseId: expense.id },
      create: {
        farmId: expense.farmId,
        section: meta.section as FinanceSection,
        type: meta.type as LedgerEntryType,
        category: meta.category as LedgerCategory,
        scope: meta.scope as LedgerScope,
        source: LedgerSource.ANIMAL_EXPENSE,
        description: expense.description,
        amount: expense.totalAmount,
        entryDate: expense.expenseDate,
        eventId: meta.eventId,
        animalId: meta.animalId,
        animalExpenseId: expense.id,
        notes: expense.notes,
        createdById: expense.createdById,
      },
      update: {
        description: expense.description,
        amount: expense.totalAmount,
        entryDate: expense.expenseDate,
        notes: expense.notes,
      },
    });
  }

  // --- Recorrentes ---
  async findRecurring(farmId: string) {
    const rows = await this.prisma.recurringLedgerTemplate.findMany({
      where: { farmId },
      orderBy: { description: 'asc' },
    });
    return rows.map((r) => this.recurringToDto(r));
  }

  private recurringToDto(row: {
    id: string;
    farmId: string;
    section: FinanceSection;
    type: LedgerEntryType;
    category: LedgerCategory;
    description: string;
    amount: Prisma.Decimal;
    frequency: RecurrenceFrequency;
    dayOfMonth: number;
    startDate: Date;
    endDate: Date | null;
    active: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): RecurringLedgerTemplateDto {
    return {
      id: row.id,
      farmId: row.farmId,
      section: row.section as RecurringLedgerTemplateDto['section'],
      type: row.type as RecurringLedgerTemplateDto['type'],
      category: row.category as RecurringLedgerTemplateDto['category'],
      description: row.description,
      amount: decimalToNumber(row.amount) ?? 0,
      frequency: row.frequency as RecurringLedgerTemplateDto['frequency'],
      dayOfMonth: row.dayOfMonth,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate?.toISOString() ?? null,
      active: row.active,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async createRecurring(farmId: string, dto: CreateRecurringTemplateDto) {
    const row = await this.prisma.recurringLedgerTemplate.create({
      data: {
        farmId,
        section:
          (dto.section as FinanceSection | undefined) ?? FinanceSection.FIXOS_RECORRENTES,
        type: dto.type as LedgerEntryType,
        category: dto.category as LedgerCategory,
        description: dto.description,
        amount: toDecimal(dto.amount)!,
        frequency:
          (dto.frequency as RecurrenceFrequency | undefined) ?? RecurrenceFrequency.MENSAL,
        dayOfMonth: dto.dayOfMonth ?? 1,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });
    return this.recurringToDto(row);
  }

  async updateRecurring(farmId: string, id: string, dto: UpdateRecurringTemplateDto) {
    await this.ensureRecurring(farmId, id);
    const row = await this.prisma.recurringLedgerTemplate.update({
      where: { id },
      data: {
        section: dto.section as FinanceSection | undefined,
        type: dto.type as LedgerEntryType | undefined,
        category: dto.category as LedgerCategory | undefined,
        description: dto.description,
        amount: dto.amount != null ? toDecimal(dto.amount)! : undefined,
        frequency: dto.frequency as RecurrenceFrequency | undefined,
        dayOfMonth: dto.dayOfMonth,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
        active: dto.active,
        notes: dto.notes,
      },
    });
    return this.recurringToDto(row);
  }

  async generateRecurring(
    farmId: string,
    templateId: string,
    dto: GenerateRecurringDto,
    user: AuthUser,
  ) {
    const template = await this.ensureRecurring(farmId, templateId);
    if (!template.active) throw new BadRequestException('Template inativo');

    const ref = this.parseMonth(dto.referenceMonth);
    const day = Math.min(template.dayOfMonth, 28);
    const entryDate = new Date(ref.getFullYear(), ref.getMonth(), day);

    if (template.startDate > entryDate) {
      throw new BadRequestException('Competência anterior ao início do template');
    }
    if (template.endDate && template.endDate < entryDate) {
      throw new BadRequestException('Template encerrado para esta competência');
    }

    const existing = await this.prisma.farmLedgerEntry.findFirst({
      where: {
        farmId,
        recurringTemplateId: templateId,
        entryDate: {
          gte: new Date(ref.getFullYear(), ref.getMonth(), 1),
          lte: new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59),
        },
      },
    });
    if (existing) {
      throw new BadRequestException('Já existe lançamento deste template neste mês');
    }

    const row = await this.prisma.farmLedgerEntry.create({
      data: {
        farmId,
        section: template.section,
        type: template.type,
        category: template.category,
        scope: LedgerScope.FAZENDA,
        source: LedgerSource.RECORRENTE,
        description: `${template.description} (${dto.referenceMonth})`,
        amount: template.amount,
        entryDate,
        recurringTemplateId: templateId,
        createdById: user.id,
      },
    });
    return this.ledgerToDto(row);
  }

  private async ensureRecurring(farmId: string, id: string) {
    const row = await this.prisma.recurringLedgerTemplate.findFirst({
      where: { id, farmId },
    });
    if (!row) throw new NotFoundException('Template não encontrado');
    return row;
  }

  // --- Funcionários ---
  async findEmployees(farmId: string) {
    const rows = await this.prisma.employee.findMany({
      where: { farmId },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.employeeToDto(r));
  }

  async createEmployee(farmId: string, dto: CreateEmployeeDto) {
    const row = await this.prisma.employee.create({
      data: {
        farmId,
        name: dto.name,
        document: dto.document,
        role: dto.role,
        baseSalary: toDecimal(dto.baseSalary),
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
        notes: dto.notes,
      },
    });
    return this.employeeToDto(row);
  }

  async updateEmployee(farmId: string, id: string, dto: UpdateEmployeeDto) {
    await this.ensureEmployee(farmId, id);
    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name,
        document: dto.document,
        role: dto.role,
        baseSalary: dto.baseSalary !== undefined ? toDecimal(dto.baseSalary) : undefined,
        admissionDate:
          dto.admissionDate !== undefined
            ? dto.admissionDate
              ? new Date(dto.admissionDate)
              : null
            : undefined,
        active: dto.active,
        notes: dto.notes,
      },
    });
    return this.employeeToDto(row);
  }

  private async ensureEmployee(farmId: string, id: string) {
    const row = await this.prisma.employee.findFirst({ where: { id, farmId } });
    if (!row) throw new NotFoundException('Funcionário não encontrado');
    return row;
  }

  // --- Folha ---
  async findPayrollRuns(farmId: string) {
    const rows = await this.prisma.payrollRun.findMany({
      where: { farmId },
      include: { lines: { include: { employee: true } } },
      orderBy: { referenceMonth: 'desc' },
    });
    return rows.map((r) => this.payrollToDto(r));
  }

  private payrollToDto(
    row: Prisma.PayrollRunGetPayload<{ include: { lines: { include: { employee: true } } } }>,
  ): PayrollRunDto {
    return {
      id: row.id,
      farmId: row.farmId,
      referenceMonth: row.referenceMonth.toISOString(),
      status: row.status as PayrollRunDto['status'],
      description: row.description,
      totalAmount: decimalToNumber(row.totalAmount) ?? 0,
      paidAt: row.paidAt?.toISOString() ?? null,
      createdById: row.createdById,
      lines: row.lines.map((line) => ({
        id: line.id,
        payrollRunId: line.payrollRunId,
        employeeId: line.employeeId,
        description: line.description,
        grossAmount: decimalToNumber(line.grossAmount) ?? 0,
        deductions: decimalToNumber(line.deductions) ?? 0,
        netAmount: decimalToNumber(line.netAmount) ?? 0,
        employee: line.employee ? this.employeeToDto(line.employee) : undefined,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async createPayrollRun(farmId: string, dto: CreatePayrollRunDto, user: AuthUser) {
    const referenceMonth = this.parseMonth(dto.referenceMonth);
    const employees = await this.prisma.employee.findMany({
      where: { farmId, active: true },
    });

    const run = await this.prisma.payrollRun.create({
      data: {
        farmId,
        referenceMonth,
        description: dto.description ?? `Folha ${dto.referenceMonth}`,
        createdById: user.id,
        lines: {
          create: employees
            .filter((e) => decimalToNumber(e.baseSalary) != null && decimalToNumber(e.baseSalary)! > 0)
            .map((e) => {
              const gross = decimalToNumber(e.baseSalary) ?? 0;
              return {
                employeeId: e.id,
                description: `Salário ${e.name}`,
                grossAmount: toDecimal(gross)!,
                deductions: toDecimal(0)!,
                netAmount: toDecimal(gross)!,
              };
            }),
        },
      },
      include: { lines: { include: { employee: true } } },
    });

    const total = run.lines.reduce((sum, l) => sum + (decimalToNumber(l.netAmount) ?? 0), 0);
    await this.prisma.payrollRun.update({
      where: { id: run.id },
      data: { totalAmount: toDecimal(total)! },
    });

    const updated = await this.prisma.payrollRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { lines: { include: { employee: true } } },
    });
    return this.payrollToDto(updated);
  }

  async addPayrollLine(farmId: string, runId: string, dto: CreatePayrollLineDto) {
    const run = await this.prisma.payrollRun.findFirst({ where: { id: runId, farmId } });
    if (!run) throw new NotFoundException('Folha não encontrada');
    if (run.status !== PayrollRunStatus.RASCUNHO) {
      throw new BadRequestException('Folha já fechada');
    }
    await this.ensureEmployee(farmId, dto.employeeId);
    const deductions = dto.deductions ?? 0;
    const net = dto.grossAmount - deductions;

    await this.prisma.payrollLine.create({
      data: {
        payrollRunId: runId,
        employeeId: dto.employeeId,
        description: dto.description,
        grossAmount: toDecimal(dto.grossAmount)!,
        deductions: toDecimal(deductions)!,
        netAmount: toDecimal(net)!,
      },
    });

    return this.refreshPayrollTotal(runId);
  }

  async closePayrollRun(farmId: string, runId: string, user: AuthUser) {
    const run = await this.ensurePayrollRun(farmId, runId, true);
    if (run.status !== PayrollRunStatus.RASCUNHO) {
      throw new BadRequestException('Folha já processada');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const line of run.lines) {
        const net = decimalToNumber(line.netAmount) ?? 0;
        await tx.farmLedgerEntry.create({
          data: {
            farmId,
            section: FinanceSection.PESSOAL_FOLHA,
            type: LedgerEntryType.DESPESA,
            category: LedgerCategory.SALARIO,
            scope: LedgerScope.FUNCIONARIO,
            source: LedgerSource.FOLHA_PAGAMENTO,
            description: line.description ?? `Folha ${run.referenceMonth.toISOString().slice(0, 7)}`,
            amount: toDecimal(net)!,
            entryDate: run.referenceMonth,
            employeeId: line.employeeId,
            payrollRunId: run.id,
            createdById: user.id,
          },
        });
      }
      await tx.payrollRun.update({
        where: { id: runId },
        data: { status: PayrollRunStatus.FECHADO },
      });
    });

    return this.findPayrollRun(farmId, runId);
  }

  async markPayrollPaid(farmId: string, runId: string) {
    const run = await this.ensurePayrollRun(farmId, runId);
    if (run.status !== PayrollRunStatus.FECHADO) {
      throw new BadRequestException('Feche a folha antes de marcar como paga');
    }
    await this.prisma.$transaction([
      this.prisma.payrollRun.update({
        where: { id: runId },
        data: { status: PayrollRunStatus.PAGO, paidAt: new Date() },
      }),
      this.prisma.farmLedgerEntry.updateMany({
        where: { payrollRunId: runId },
        data: { paidAt: new Date() },
      }),
    ]);
    return this.findPayrollRun(farmId, runId);
  }

  private async refreshPayrollTotal(runId: string) {
    const lines = await this.prisma.payrollLine.findMany({ where: { payrollRunId: runId } });
    const total = lines.reduce((sum, l) => sum + (decimalToNumber(l.netAmount) ?? 0), 0);
    const run = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { totalAmount: toDecimal(total)! },
      include: { lines: { include: { employee: true } } },
    });
    return this.payrollToDto(run);
  }

  private async findPayrollRun(farmId: string, runId: string) {
    const run = await this.ensurePayrollRun(farmId, runId, true);
    return this.payrollToDto(run);
  }

  private async ensurePayrollRun(farmId: string, id: string, withLines = false) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, farmId },
      include: withLines ? { lines: { include: { employee: true } } } : undefined,
    });
    if (!run) throw new NotFoundException('Folha não encontrada');
    return run as Prisma.PayrollRunGetPayload<{ include: { lines: { include: { employee: true } } } }>;
  }
}
