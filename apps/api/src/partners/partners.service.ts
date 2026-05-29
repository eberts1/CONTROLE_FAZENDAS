import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';
import {
  PartnerDetailDto,
  PartnerDto,
  PartnerFillableField,
  PartnerLinkCounts,
  PartnerMergeResultDto,
  PartnerPurchaseItemDto,
  FarmLedgerEntryDto,
  formatDocument,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { CreatePartnerDto, UpdatePartnerDto } from '../common/dto';
import { SaleInstallmentsService } from '../sale-installments/sale-installments.service';
import { decimalToNumber } from '../common/decimal.util';

type PartnerRecord = Prisma.PartnerGetPayload<object>;

const PARTNER_SCALAR_FIELDS = [
  'name',
  'document',
  'email',
  'phone',
  'phone2',
  'phone3',
  'address',
  'city',
  'state',
  'zipCode',
  'ranchName',
  'ranchCity',
  'ranchState',
  'ranchRegistration',
  'notes',
] as const;

@Injectable()
export class PartnersService {
  constructor(
    private prisma: PrismaService,
    private saleInstallmentsService: SaleInstallmentsService,
  ) {}

  toDto(partner: PartnerRecord): PartnerDto {
    return {
      id: partner.id,
      farmId: partner.farmId,
      name: partner.name,
      document: partner.document,
      email: partner.email,
      phone: partner.phone,
      phone2: partner.phone2,
      phone3: partner.phone3,
      address: partner.address,
      city: partner.city,
      state: partner.state,
      zipCode: partner.zipCode,
      ranchName: partner.ranchName,
      ranchCity: partner.ranchCity,
      ranchState: partner.ranchState,
      ranchRegistration: partner.ranchRegistration,
      notes: partner.notes,
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
    };
  }

  private partnerDataFromDto(dto: CreatePartnerDto | UpdatePartnerDto) {
    const data: Prisma.PartnerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.document !== undefined) {
      data.document = dto.document ? formatDocument(dto.document) : null;
    }
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.phone2 !== undefined) data.phone2 = dto.phone2 || null;
    if (dto.phone3 !== undefined) data.phone3 = dto.phone3 || null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.city !== undefined) data.city = dto.city || null;
    if (dto.state !== undefined) data.state = dto.state || null;
    if (dto.zipCode !== undefined) data.zipCode = dto.zipCode || null;
    if (dto.ranchName !== undefined) data.ranchName = dto.ranchName || null;
    if (dto.ranchCity !== undefined) data.ranchCity = dto.ranchCity || null;
    if (dto.ranchState !== undefined) data.ranchState = dto.ranchState || null;
    if (dto.ranchRegistration !== undefined) {
      data.ranchRegistration = dto.ranchRegistration || null;
    }
    if (dto.notes !== undefined) data.notes = dto.notes || null;
    return data;
  }

  async findAll(farmId: string) {
    const partners = await this.prisma.partner.findMany({
      where: { farmId },
      orderBy: { name: 'asc' },
    });
    return partners.map((p) => this.toDto(p));
  }

  async findAllRecords(farmId: string) {
    return this.prisma.partner.findMany({
      where: { farmId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(farmId: string, id: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, farmId },
    });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    return this.toDto(partner);
  }

  async getDetail(farmId: string, id: string): Promise<PartnerDetailDto> {
    const partner = await this.prisma.partner.findFirst({
      where: { id, farmId },
    });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');

    const [linkCounts, purchaseRows, installments, installmentsSummary, ledgerRows] =
      await Promise.all([
        this.getLinkCounts(id),
        this.prisma.animalSale.findMany({
          where: { farmId, buyerPartnerId: id },
          include: {
            animal: { select: { tag: true, name: true } },
            event: { select: { name: true } },
          },
          orderBy: { transactionDate: 'desc' },
        }),
        this.saleInstallmentsService.findAll(farmId, { buyerPartnerId: id }),
        this.saleInstallmentsService.getSummary(farmId, { buyerPartnerId: id }),
        this.prisma.farmLedgerEntry.findMany({
          where: { farmId, partnerId: id },
          include: {
            event: { select: { id: true, name: true, type: true, status: true } },
          },
          orderBy: { entryDate: 'desc' },
        }),
      ]);

    const purchases: PartnerPurchaseItemDto[] = purchaseRows.map((sale) => ({
      id: sale.id,
      description: sale.description,
      totalAmount: decimalToNumber(sale.totalAmount) ?? 0,
      transactionDate: sale.transactionDate.toISOString(),
      type: sale.type as PartnerPurchaseItemDto['type'],
      applyOwnershipTransfer: sale.applyOwnershipTransfer,
      quotaPercent: decimalToNumber(sale.quotaPercent),
      animalTag: sale.animal?.tag ?? null,
      animalName: sale.animal?.name ?? null,
      eventName: sale.event?.name ?? null,
    }));

    let totalRevenue = 0;
    let totalExpense = 0;
    for (const row of ledgerRows) {
      const amount = decimalToNumber(row.amount) ?? 0;
      if (row.type === LedgerEntryType.RECEITA) totalRevenue += amount;
      else totalExpense += amount;
    }

    const ledgerEntries: FarmLedgerEntryDto[] = ledgerRows.map((row) => ({
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
      event: row.event
        ? ({
            id: row.event.id,
            name: row.event.name,
            type: row.event.type,
            status: row.event.status,
          } as NonNullable<FarmLedgerEntryDto['event']>)
        : undefined,
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
    }));

    return {
      partner: this.toDto(partner),
      linkCounts,
      purchases,
      installmentsSummary,
      installments,
      ledgerEntries,
      financialSummary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        balance: Math.round((totalRevenue - totalExpense) * 100) / 100,
      },
    };
  }

  async create(farmId: string, dto: CreatePartnerDto) {
    try {
      const partner = await this.prisma.partner.create({
        data: {
          farmId,
          name: dto.name,
          document: dto.document ? formatDocument(dto.document) : null,
          email: dto.email || null,
          phone: dto.phone || null,
          phone2: dto.phone2 || null,
          phone3: dto.phone3 || null,
          address: dto.address || null,
          city: dto.city || null,
          state: dto.state || null,
          zipCode: dto.zipCode || null,
          ranchName: dto.ranchName || null,
          ranchCity: dto.ranchCity || null,
          ranchState: dto.ranchState || null,
          ranchRegistration: dto.ranchRegistration || null,
          notes: dto.notes || null,
        },
      });
      return this.toDto(partner);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um parceiro com este documento nesta fazenda');
      }
      throw e;
    }
  }

  async update(farmId: string, id: string, dto: UpdatePartnerDto) {
    await this.findOne(farmId, id);
    try {
      const partner = await this.prisma.partner.update({
        where: { id },
        data: this.partnerDataFromDto(dto),
      });
      return this.toDto(partner);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um parceiro com este documento nesta fazenda');
      }
      throw e;
    }
  }

  async fillEmptyFields(
    farmId: string,
    id: string,
    fields: Partial<Record<PartnerFillableField, string | null>>,
  ) {
    const partner = await this.prisma.partner.findFirst({ where: { id, farmId } });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');

    const data: Prisma.PartnerUpdateInput = {};
    for (const key of PARTNER_SCALAR_FIELDS) {
      const incoming = fields[key as PartnerFillableField];
      if (!incoming?.trim()) continue;
      const current = partner[key as keyof PartnerRecord];
      if (current == null || String(current).trim() === '') {
        if (key === 'document') {
          data.document = formatDocument(incoming);
        } else {
          (data as Record<string, string | null>)[key] = incoming.trim();
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return this.toDto(partner);
    }

    const updated = await this.prisma.partner.update({ where: { id }, data });
    return this.toDto(updated);
  }

  async remove(farmId: string, id: string) {
    await this.findOne(farmId, id);

    const linked = await this.prisma.animalOwnership.count({
      where: { partnerId: id },
    });
    if (linked > 0) {
      throw new ConflictException(
        'Parceiro vinculado a cotas de animais. Remova os vínculos antes de excluir.',
      );
    }

    await this.prisma.partner.delete({ where: { id } });
    return { ok: true };
  }

  async findOrCreateDefaultForFarm(farmId: string, farmName: string) {
    let partner = await this.prisma.partner.findFirst({
      where: { farmId, name: farmName },
    });

    if (!partner) {
      partner = await this.prisma.partner.create({
        data: { farmId, name: farmName },
      });
    }

    return partner;
  }

  async getLinkCounts(partnerId: string): Promise<PartnerLinkCounts> {
    const [
      ownerships,
      salesAsBuyer,
      installmentPlans,
      saleAllocations,
      expenseAllocations,
      ledgerEntries,
      salesAsSeller,
    ] = await Promise.all([
      this.prisma.animalOwnership.count({ where: { partnerId } }),
      this.prisma.animalSale.count({ where: { buyerPartnerId: partnerId } }),
      this.prisma.saleInstallmentPlan.count({ where: { buyerPartnerId: partnerId } }),
      this.prisma.animalSaleAllocation.count({ where: { partnerId } }),
      this.prisma.animalExpenseAllocation.count({ where: { partnerId } }),
      this.prisma.farmLedgerEntry.count({ where: { partnerId } }),
      this.prisma.animalSale.count({
        where: { sellerPartnerIds: { has: partnerId } },
      }),
    ]);

    const total =
      ownerships +
      salesAsBuyer +
      installmentPlans +
      saleAllocations +
      expenseAllocations +
      ledgerEntries +
      salesAsSeller;

    return {
      ownerships,
      salesAsBuyer,
      installmentPlans,
      saleAllocations,
      expenseAllocations,
      ledgerEntries,
      salesAsSeller,
      total,
    };
  }

  async mergePartners(
    farmId: string,
    keepPartnerId: string,
    mergePartnerIds: string[],
  ): Promise<PartnerMergeResultDto> {
    const uniqueMergeIds = [...new Set(mergePartnerIds.filter((id) => id !== keepPartnerId))];
    if (uniqueMergeIds.length === 0) {
      throw new ConflictException('Informe ao menos um parceiro para unificar');
    }

    const allIds = [keepPartnerId, ...uniqueMergeIds];
    const partners = await this.prisma.partner.findMany({
      where: { farmId, id: { in: allIds } },
    });

    if (partners.length !== allIds.length) {
      throw new NotFoundException('Um ou mais parceiros não foram encontrados nesta fazenda');
    }

    const keep = partners.find((p) => p.id === keepPartnerId)!;
    const mergePartners = partners.filter((p) => p.id !== keepPartnerId);
    const fieldsFilled: string[] = [];

    return this.prisma.$transaction(async (tx) => {
      const fillData: Prisma.PartnerUpdateInput = {};
      for (const dup of mergePartners) {
        for (const key of PARTNER_SCALAR_FIELDS) {
          const current = keep[key as keyof PartnerRecord];
          const incoming = dup[key as keyof PartnerRecord];
          if ((current == null || String(current).trim() === '') && incoming) {
            if (!(key in fillData)) {
              (fillData as Record<string, unknown>)[key] = incoming;
              fieldsFilled.push(key);
            }
          }
        }
      }

      if (Object.keys(fillData).length > 0) {
        await tx.partner.update({ where: { id: keepPartnerId }, data: fillData });
      }

      for (const mergeId of uniqueMergeIds) {
        await tx.animalSale.updateMany({
          where: { buyerPartnerId: mergeId },
          data: { buyerPartnerId: keepPartnerId },
        });

        await tx.saleInstallmentPlan.updateMany({
          where: { buyerPartnerId: mergeId },
          data: { buyerPartnerId: keepPartnerId },
        });

        await tx.animalSaleAllocation.updateMany({
          where: { partnerId: mergeId },
          data: { partnerId: keepPartnerId },
        });

        await tx.animalExpenseAllocation.updateMany({
          where: { partnerId: mergeId },
          data: { partnerId: keepPartnerId },
        });

        await tx.farmLedgerEntry.updateMany({
          where: { partnerId: mergeId },
          data: { partnerId: keepPartnerId },
        });

        const salesWithSeller = await tx.animalSale.findMany({
          where: { sellerPartnerIds: { has: mergeId } },
          select: { id: true, sellerPartnerIds: true },
        });
        for (const sale of salesWithSeller) {
          const nextIds = [
            ...new Set(
              sale.sellerPartnerIds.map((id) => (id === mergeId ? keepPartnerId : id)),
            ),
          ];
          await tx.animalSale.update({
            where: { id: sale.id },
            data: { sellerPartnerIds: nextIds },
          });
        }

        const dupOwnerships = await tx.animalOwnership.findMany({
          where: { partnerId: mergeId },
        });

        for (const ownership of dupOwnerships) {
          const existing = await tx.animalOwnership.findUnique({
            where: {
              animalId_partnerId: {
                animalId: ownership.animalId,
                partnerId: keepPartnerId,
              },
            },
          });

          if (existing) {
            const combined = Number(existing.ownershipPercent) + Number(ownership.ownershipPercent);
            if (combined > 100.01) {
              throw new ConflictException(
                `Não foi possível unificar: cotas do animal excedem 100% (${combined.toFixed(2)}%). Ajuste manualmente antes de unificar.`,
              );
            }
            await tx.animalOwnership.update({
              where: { id: existing.id },
              data: {
                ownershipPercent: combined,
                isPrimary: existing.isPrimary || ownership.isPrimary,
              },
            });
            await tx.animalOwnership.delete({ where: { id: ownership.id } });
          } else {
            await tx.animalOwnership.update({
              where: { id: ownership.id },
              data: { partnerId: keepPartnerId },
            });
          }
        }

        await tx.partner.delete({ where: { id: mergeId } });
      }

      return {
        keptPartnerId: keepPartnerId,
        mergedPartnerIds: uniqueMergeIds,
        fieldsFilled: [...new Set(fieldsFilled)],
      };
    });
  }
}
