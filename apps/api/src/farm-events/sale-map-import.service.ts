import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  AnimalSaleType,
  AnimalStatus,
  PaymentCondition,
  SaleAssetScope,
} from '@prisma/client';
import {
  SaleMapImportPreviewDto,
  SaleMapImportResultDto,
  SaleMapSyncInstallmentsResultDto,
  buildAnimalDraftFromSaleLot,
  buildDefaultInstallmentPaidFlags,
  detectSaleMapSourceFormat,
  matchAnimalByRegistration,
  matchPartnerByName,
  normalizeSaleMapInstallments,
  parseSaleMapText,
  roundMoney,
  validateInstallmentTotals,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { AuthUser } from '../common/decorators';
import { ImportSaleMapDto, SaleMapImportLotDto } from '../common/dto';
import { AnimalFinancesService } from '../animal-finances/animal-finances.service';
import { AnimalOwnershipService } from '../animal-ownership/animal-ownership.service';
import { AnimalsService } from '../animals/animals.service';
import { PartnersService } from '../partners/partners.service';
import { SaleInstallmentsService } from '../sale-installments/sale-installments.service';
import { extractPdfText } from './pdf-text.util';
import { FarmEventsService } from './farm-events.service';
import { decimalToNumber } from '../common/decimal.util';

export type UploadedPdfFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type ImportInstallmentRow = {
  sequence: number;
  label: string;
  amount: number;
  dueDate: string;
  markAsPaid?: boolean;
  paidAt?: string;
};

@Injectable()
export class SaleMapImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmEventsService: FarmEventsService,
    private readonly animalFinancesService: AnimalFinancesService,
    private readonly animalOwnershipService: AnimalOwnershipService,
    private readonly animalsService: AnimalsService,
    private readonly partnersService: PartnersService,
    private readonly saleInstallmentsService: SaleInstallmentsService,
  ) {}

  private resolveInstallmentsForLot(
    lot: Pick<
      SaleMapImportLotDto,
      'installments' | 'isCashPayment' | 'netAmount' | 'totalAmount' | 'entryAmount'
    >,
    fallbackDueDate: string,
  ): ImportInstallmentRow[] {
    if (lot.isCashPayment) {
      return [];
    }

    const netAmount = lot.netAmount ?? lot.totalAmount ?? null;
    const raw = lot.installments ?? [];
    const normalized = normalizeSaleMapInstallments({
      netAmount,
      entryAmount: lot.entryAmount ?? null,
      installments: raw.map((row) => ({
        sequence: row.sequence,
        label: row.label,
        amount: row.amount,
        dueDate: row.dueDate,
      })),
      fallbackDueDate,
    });

    if (normalized.length > 0) {
      return normalized.map((row) => {
        const existing = raw.find((item) => item.sequence === row.sequence);
        return {
          sequence: row.sequence,
          label: row.label,
          amount: row.amount,
          dueDate: row.dueDate,
          markAsPaid: existing?.markAsPaid,
          paidAt: existing?.paidAt ?? undefined,
        };
      });
    }

    if (netAmount && netAmount > 0) {
      return [
        {
          sequence: 0,
          label: 'Entrada',
          amount: netAmount,
          dueDate: fallbackDueDate,
          markAsPaid: true,
          paidAt: fallbackDueDate,
        },
      ];
    }

    return [];
  }

  private async createInstallmentPlanForLot(
    farmId: string,
    lot: SaleMapImportLotDto,
    sale: { id: string },
    buyerPartnerId: string,
    netAmount: number,
    bidValue: number | undefined,
    transactionDate: string,
    user: AuthUser,
  ) {
    const installments = this.resolveInstallmentsForLot(lot, transactionDate);
    if (lot.isCashPayment || installments.length === 0) {
      return;
    }

    await this.saleInstallmentsService.createPlan(
      farmId,
      {
        saleId: sale.id,
        buyerPartnerId,
        auctionLotNumber: lot.canal,
        netAmount,
        bidValue,
        installments: installments.map((row) => ({
          sequence: row.sequence,
          label: row.label,
          amount: row.amount,
          dueDate: row.dueDate,
          markAsPaid: row.markAsPaid,
          paidAt: row.paidAt ?? undefined,
        })),
      },
      user,
      { totalTolerance: 1 },
    );
  }

  async previewFromPdf(
    farmId: string,
    eventId: string,
    file: UploadedPdfFile,
    password?: string,
  ): Promise<SaleMapImportPreviewDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Envie um arquivo PDF do mapa de venda');
    }
    await this.farmEventsService.findOne(farmId, eventId);

    const text = await extractPdfText(file.buffer, password);
    return this.buildPreview(farmId, text);
  }

  async buildPreview(farmId: string, text: string): Promise<SaleMapImportPreviewDto> {
    const sourceFormat = detectSaleMapSourceFormat(text);
    const parsed = parseSaleMapText(text);
    const [animals, partners] = await Promise.all([
      this.prisma.animal.findMany({
        where: { farmId },
        select: {
          id: true,
          tag: true,
          name: true,
          abczSerie: true,
          abczRgn: true,
        },
      }),
      this.prisma.partner.findMany({
        where: { farmId },
        select: { id: true, name: true },
      }),
    ]);

    const paidDefaultsReference = parsed.eventDate ? new Date(parsed.eventDate) : new Date();

    const lots = parsed.lots.map((lot) => {
      const blockingWarnings: string[] = [];
      const infoWarnings: string[] = [];
      const matchedAnimal = matchAnimalByRegistration(
        lot.registration,
        animals,
        lot.description,
      );
      const matchedPartner = matchPartnerByName(lot.buyerName, partners);
      const animalDraft = buildAnimalDraftFromSaleLot(lot);

      if (!lot.buyerName) blockingWarnings.push('Comprador não identificado no PDF');
      if (!matchedAnimal) {
        infoWarnings.push(
          lot.registration || lot.description
            ? `Animal não cadastrado (${lot.registration ?? lot.description}) — será criado como "${animalDraft.tag}" em Animais`
            : `Animal não identificado no PDF — será criado como "${animalDraft.tag}" em Animais`,
        );
      }
      if (!matchedPartner && lot.buyerName) {
        infoWarnings.push('Comprador será criado como parceiro');
      }
      if (lot.netAmount == null || lot.netAmount <= 0) {
        blockingWarnings.push('Valor líquido inválido');
      }

      const scheduleInstallments = normalizeSaleMapInstallments({
        netAmount: lot.netAmount,
        entryAmount: lot.entryAmount,
        installments: lot.installments,
        fallbackDueDate: parsed.eventDate ?? undefined,
      });

      if (
        !lot.isCashPayment &&
        lot.netAmount != null &&
        scheduleInstallments.length > 0 &&
        !validateInstallmentTotals(lot.netAmount, scheduleInstallments, 1)
      ) {
        infoWarnings.push('Soma das parcelas difere do valor líquido (pode ajustar na importação)');
      }

      const warnings = [...blockingWarnings, ...infoWarnings];

      const defaultPaidFlags = buildDefaultInstallmentPaidFlags(
        scheduleInstallments,
        paidDefaultsReference,
      );

      const installments =
        lot.isCashPayment || scheduleInstallments.length === 0
          ? lot.netAmount != null
            ? [
                {
                  sequence: 0,
                  label: 'Entrada',
                  amount: lot.netAmount,
                  dueDate:
                    scheduleInstallments[0]?.dueDate ??
                    parsed.eventDate ??
                    new Date().toISOString(),
                  markAsPaid: true,
                  paidAt:
                    scheduleInstallments[0]?.dueDate ??
                    parsed.eventDate ??
                    new Date().toISOString(),
                },
              ]
            : []
          : scheduleInstallments.map((row, index) => ({
              sequence: row.sequence,
              label: row.label,
              amount: row.amount,
              dueDate: row.dueDate,
              markAsPaid: defaultPaidFlags[index] ?? false,
              paidAt: defaultPaidFlags[index] ? row.dueDate : null,
            }));

      return {
        tempId: `lot-${lot.canal}`,
        selected: blockingWarnings.length === 0,
        canal: lot.canal,
        description: lot.description,
        registration: lot.registration,
        animalId: matchedAnimal?.id ?? null,
        animalTag: matchedAnimal?.tag ?? null,
        animalName: matchedAnimal?.name ?? null,
        createAnimal: !matchedAnimal,
        suggestedAnimalTag: matchedAnimal ? null : animalDraft.tag,
        buyerName: lot.buyerName,
        buyerPartnerId: matchedPartner?.id ?? null,
        createBuyer: !matchedPartner && !!lot.buyerName,
        bidValue: lot.bidValue,
        captures: lot.captures ?? 30,
        quantity: lot.quantity ?? 1,
        totalAmount: lot.totalAmount,
        netAmount: lot.netAmount,
        discountAmount: lot.discountAmount,
        entryAmount: lot.entryAmount,
        isCashPayment: lot.isCashPayment,
        installments,
        warnings,
      };
    });

    return {
      document: {
        eventName: parsed.eventName,
        eventDate: parsed.eventDate,
        location: parsed.location,
        sellerName: parsed.sellerName,
        lotCount: lots.length,
        sourceFormat,
      },
      lots,
    };
  }

  async importLots(
    farmId: string,
    eventId: string,
    dto: ImportSaleMapDto,
    user: AuthUser,
  ): Promise<SaleMapImportResultDto> {
    const event = await this.farmEventsService.findOne(farmId, eventId);
    const selectedLots = dto.lots.filter((lot) => lot.selected);
    if (selectedLots.length === 0) {
      throw new BadRequestException('Selecione ao menos um lote para importar');
    }

    const transactionDate =
      dto.transactionDate ?? event.startDate ?? event.endDate ?? new Date().toISOString();

    const result: SaleMapImportResultDto = {
      imported: 0,
      skipped: dto.lots.length - selectedLots.length,
      salesCreated: [],
      partnersCreated: [],
      animalsCreated: [],
      warnings: [],
    };

    const animals = await this.prisma.animal.findMany({
      where: { farmId },
      select: {
        id: true,
        tag: true,
        name: true,
        abczSerie: true,
        abczRgn: true,
      },
    });

    for (const lot of selectedLots) {
      let animalId = lot.animalId ?? null;
      if (!animalId) {
        if (lot.createAnimal === false) {
          result.warnings.push(`Lote ${lot.canal}: animal não vinculado — ignorado`);
          continue;
        }

        try {
          const resolved = await this.resolveOrCreateAnimal(farmId, lot, animals);
          animalId = resolved.animalId;
          if (resolved.created) {
            result.animalsCreated.push(resolved.animalId);
            animals.push({
              id: resolved.animalId,
              tag: resolved.tag,
              name: resolved.name,
              abczSerie: resolved.abczSerie,
              abczRgn: resolved.abczRgn,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido';
          result.warnings.push(`Lote ${lot.canal}: ${message}`);
          continue;
        }
      }

      let buyerPartnerId = lot.buyerPartnerId ?? null;
      if (!buyerPartnerId) {
        const buyerName = lot.buyerName?.trim();
        if (!buyerName) {
          result.warnings.push(`Lote ${lot.canal}: comprador não informado — ignorado`);
          continue;
        }
        if (lot.createBuyer !== false) {
          const created = await this.partnersService.create(farmId, { name: buyerName });
          buyerPartnerId = created.id;
          result.partnersCreated.push(created.id);
        } else {
          result.warnings.push(`Lote ${lot.canal}: comprador não selecionado — ignorado`);
          continue;
        }
      }

      const netAmount = lot.netAmount ?? lot.totalAmount;
      if (!netAmount || netAmount <= 0) {
        result.warnings.push(`Lote ${lot.canal}: valor líquido inválido — ignorado`);
        continue;
      }

      const totalAmount = lot.totalAmount ?? netAmount;
      const bidValue = lot.bidValue ?? undefined;
      const captures = lot.captures ?? 30;
      const quantity = lot.quantity ?? 1;
      const isCashPayment = lot.isCashPayment === true;
      const installments = this.resolveInstallmentsForLot(lot, transactionDate);

      if (
        !isCashPayment &&
        installments.length > 0 &&
        !validateInstallmentTotals(netAmount, installments, 1)
      ) {
        result.warnings.push(
          `Lote ${lot.canal}: parcelas diferem do líquido em até R$ 1,00 — importado mesmo assim`,
        );
      }

      try {
        await this.animalOwnershipService.ensureSinglePrimaryOwner(animalId, farmId);

        const description =
          lot.description?.trim() ||
          `Lote ${lot.canal}${lot.registration ? ` — ${lot.registration}` : ''}`;

        const grossAmount = totalAmount;
        const discountAmount = lot.discountAmount ?? roundMoney(grossAmount - netAmount);
        const discountPercent =
          discountAmount > 0 && grossAmount > 0
            ? roundMoney((discountAmount / grossAmount) * 100)
            : undefined;

        const shares = await this.animalOwnershipService.getSharesForAllocation(animalId);
        const allocationOverrides =
          discountPercent && discountPercent > 0
            ? shares.map((share) => ({
                partnerId: share.partnerId,
                discountPercent,
                entryAmount: isCashPayment ? netAmount : installments[0]?.amount,
              }))
            : undefined;

        const sale = await this.animalFinancesService.createSale(
          farmId,
          animalId,
          {
            eventId,
            type: AnimalSaleType.VENDA_ANIMAL,
            assetScope: SaleAssetScope.ANIMAL_INTEIRO,
            description,
            totalAmount: grossAmount,
            transactionDate,
            unitValue: bidValue,
            quantity,
            captures,
            paymentCondition: isCashPayment ? PaymentCondition.A_VISTA : PaymentCondition.PARCELADO,
            buyerPartnerId,
            applyOwnershipTransfer: false,
            allocationOverrides,
          },
          user,
        );

        await this.prisma.animalSale.update({
          where: { id: sale.id },
          data: { auctionLotNumber: lot.canal },
        });

        if (!isCashPayment) {
          try {
            await this.createInstallmentPlanForLot(
              farmId,
              lot,
              sale,
              buyerPartnerId,
              netAmount,
              bidValue,
              transactionDate,
              user,
            );
          } catch (planError) {
            const message = planError instanceof Error ? planError.message : 'Erro desconhecido';
            result.warnings.push(
              `Lote ${lot.canal}: venda criada, mas parcelas não registradas — ${message}`,
            );
          }
        }

        result.imported += 1;
        result.salesCreated.push(sale.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        result.warnings.push(`Lote ${lot.canal}: ${message}`);
      }
    }

    return result;
  }

  async syncInstallmentPlans(
    farmId: string,
    eventId: string,
    dto: ImportSaleMapDto,
    user: AuthUser,
  ): Promise<SaleMapSyncInstallmentsResultDto> {
    await this.farmEventsService.findOne(farmId, eventId);
    const selectedLots = dto.lots.filter((lot) => lot.selected);
    if (selectedLots.length === 0) {
      throw new BadRequestException('Selecione ao menos um lote para sincronizar');
    }

    const transactionDate =
      dto.transactionDate ??
      (await this.farmEventsService.findOne(farmId, eventId)).startDate ??
      new Date().toISOString();

    const result: SaleMapSyncInstallmentsResultDto = {
      synced: 0,
      skipped: 0,
      alreadyHasPlan: 0,
      warnings: [],
    };

    for (const lot of selectedLots) {
      if (lot.isCashPayment) {
        result.skipped += 1;
        continue;
      }

      const sale = await this.prisma.animalSale.findFirst({
        where: {
          farmId,
          eventId,
          auctionLotNumber: lot.canal,
        },
        include: {
          installmentPlans: { select: { id: true } },
        },
      });

      if (!sale) {
        result.warnings.push(`Lote ${lot.canal}: venda não encontrada no evento`);
        result.skipped += 1;
        continue;
      }

      if (sale.installmentPlans.length > 0) {
        result.alreadyHasPlan += 1;
        continue;
      }

      const netAmount = lot.netAmount ?? lot.totalAmount ?? decimalToNumber(sale.totalAmount);
      if (!netAmount || netAmount <= 0) {
        result.warnings.push(`Lote ${lot.canal}: valor líquido inválido`);
        result.skipped += 1;
        continue;
      }

      const buyerPartnerId = lot.buyerPartnerId ?? sale.buyerPartnerId;
      if (!buyerPartnerId) {
        result.warnings.push(`Lote ${lot.canal}: comprador não identificado`);
        result.skipped += 1;
        continue;
      }

      try {
        await this.createInstallmentPlanForLot(
          farmId,
          lot,
          sale,
          buyerPartnerId,
          netAmount,
          lot.bidValue ?? undefined,
          transactionDate,
          user,
        );
        result.synced += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        result.warnings.push(`Lote ${lot.canal}: ${message}`);
        result.skipped += 1;
      }
    }

    return result;
  }

  private async resolveOrCreateAnimal(
    farmId: string,
    lot: SaleMapImportLotDto,
    animals: Array<{
      id: string;
      tag: string;
      name: string | null;
      abczSerie: string | null;
      abczRgn: string | null;
    }>,
  ): Promise<{
    animalId: string;
    created: boolean;
    tag: string;
    name: string | null;
    abczSerie: string | null;
    abczRgn: string | null;
  }> {
    const matched = matchAnimalByRegistration(lot.registration, animals, lot.description);
    if (matched) {
      return {
        animalId: matched.id,
        created: false,
        tag: matched.tag,
        name: matched.name,
        abczSerie: matched.abczSerie ?? null,
        abczRgn: matched.abczRgn ?? null,
      };
    }

    const draft = buildAnimalDraftFromSaleLot(lot);

    const byTag = await this.prisma.animal.findFirst({
      where: { farmId, tag: draft.tag },
      select: { id: true, tag: true, name: true, abczSerie: true, abczRgn: true },
    });
    if (byTag) {
      return { animalId: byTag.id, created: false, ...byTag };
    }

    if (draft.abczSerie && draft.abczRgn) {
      const byAbcz = await this.prisma.animal.findFirst({
        where: { farmId, abczSerie: draft.abczSerie, abczRgn: draft.abczRgn },
        select: { id: true, tag: true, name: true, abczSerie: true, abczRgn: true },
      });
      if (byAbcz) {
        return { animalId: byAbcz.id, created: false, ...byAbcz };
      }
    }

    const created = await this.animalsService.create(farmId, {
      tag: draft.tag,
      name: draft.name,
      sex: draft.sex,
      status: AnimalStatus.ATIVO,
      notes: draft.notes,
      abczSerie: draft.abczSerie,
      abczRgn: draft.abczRgn,
    });

    return {
      animalId: created.id,
      created: true,
      tag: created.tag,
      name: created.name,
      abczSerie: created.abczSerie,
      abczRgn: created.abczRgn,
    };
  }
}
