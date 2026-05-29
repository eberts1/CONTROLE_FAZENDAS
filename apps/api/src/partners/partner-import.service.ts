import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  PartnerImportPreviewDto,
  PartnerImportResultDto,
  PartnerDuplicateGroupDto,
  buildDuplicateGroups,
  detectBuyerListFormat,
  matchPartner,
  parseBulaBuyerListText,
  parsedBuyerToPartnerFields,
  resolveImportAction,
} from '@controle-fazendas/shared';
import { PartnersService } from './partners.service';
import { extractPdfText } from '../farm-events/pdf-text.util';
import { ImportPartnerBuyersDto } from '../common/dto';

export type UploadedPdfFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class PartnerImportService {
  constructor(private readonly partnersService: PartnersService) {}

  async previewFromPdf(
    farmId: string,
    file: UploadedPdfFile | undefined,
    password?: string,
  ): Promise<PartnerImportPreviewDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Arquivo PDF não enviado');
    }

    const text = await extractPdfText(file.buffer, password);
    if (!detectBuyerListFormat(text)) {
      throw new BadRequestException(
        'Formato não reconhecido. Envie um PDF "Relação de Compradores" da Bula Remates.',
      );
    }

    const parsedRows = parseBulaBuyerListText(text);
    const partners = await this.partnersService.findAll(farmId);

    const titleMatch = text.match(/RELAÇÃO DE COMPRADORES[\s\S]*?(?=\nBULA|\nNOME)/i);

    const rows = parsedRows.map((row, index) => {
      const fields = parsedBuyerToPartnerFields(row);
      const match = matchPartner(
        { name: row.name, document: row.document, email: row.email },
        partners,
      );

      const action = resolveImportAction(
        match,
        match?.partner ?? null,
        fields,
      );

      return {
        tempId: `buyer-${index + 1}`,
        selected: action !== 'skip',
        parsed: {
          name: row.name,
          document: row.document,
          email: row.email,
          phone: row.phone,
          phone2: row.phone2,
          phone3: row.phone3,
          address: row.address,
          city: row.city,
          state: row.state,
          zipCode: row.zipCode,
          ranchName: row.ranchName,
          ranchCity: row.ranchCity,
          ranchState: row.ranchState,
          ranchRegistration: row.ranchRegistration,
          rawBlock: row.rawBlock,
        },
        matchedPartnerId: match?.partnerId ?? null,
        matchedPartnerName: match?.partnerName ?? null,
        matchType: match?.matchType ?? null,
        action,
        fieldsToFill: match?.fieldsToFill ?? [],
      };
    });

    return {
      document: {
        title: titleMatch?.[0]?.split('\n').slice(0, 3).join(' — ') ?? 'Relação de Compradores',
        buyerCount: rows.length,
        sourceFormat: 'BULA_BUYER_LIST',
      },
      rows,
    };
  }

  async importRows(
    farmId: string,
    dto: ImportPartnerBuyersDto,
  ): Promise<PartnerImportResultDto> {
    const result: PartnerImportResultDto = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const row of dto.rows) {
      if (!row.selected) continue;

      try {
        if (row.action === 'skip') {
          result.skipped++;
          continue;
        }

        const parsed = row.parsed;

        if (row.action === 'create') {
          await this.partnersService.create(farmId, {
            name: parsed.name,
            document: parsed.document ?? undefined,
            email: parsed.email ?? undefined,
            phone: parsed.phone ?? undefined,
            phone2: parsed.phone2 ?? undefined,
            phone3: parsed.phone3 ?? undefined,
            address: parsed.address ?? undefined,
            city: parsed.city ?? undefined,
            state: parsed.state ?? undefined,
            zipCode: parsed.zipCode ?? undefined,
            ranchName: parsed.ranchName ?? undefined,
            ranchCity: parsed.ranchCity ?? undefined,
            ranchState: parsed.ranchState ?? undefined,
            ranchRegistration: parsed.ranchRegistration ?? undefined,
          });
          result.created++;
          continue;
        }

        if (row.action === 'update' && row.matchedPartnerId) {
          await this.partnersService.fillEmptyFields(farmId, row.matchedPartnerId, parsed);
          result.updated++;
          continue;
        }

        if (row.matchedPartnerId) {
          result.skipped++;
        } else {
          result.errors.push(`${parsed.name}: ação inválida ou parceiro não informado`);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erro desconhecido';
        result.errors.push(`${row.parsed.name}: ${message}`);
      }
    }

    return result;
  }

  async findDuplicates(farmId: string): Promise<PartnerDuplicateGroupDto[]> {
    const partners = await this.partnersService.findAll(farmId);
    const withCounts = await Promise.all(
      partners.map(async (partner) => ({
        ...partner,
        linkCount: (await this.partnersService.getLinkCounts(partner.id)).total,
      })),
    );

    const groups = buildDuplicateGroups(withCounts);

    return Promise.all(
      groups.map(async (group) => {
        const groupPartners = await Promise.all(
          group.partnerIds.map(async (id) => {
            const partner = partners.find((p) => p.id === id)!;
            const linkCounts = await this.partnersService.getLinkCounts(id);
            return { ...partner, linkCounts };
          }),
        );

        return {
          groupId: group.groupId,
          reason: group.reason,
          confidence: group.confidence,
          reviewRequired: group.reviewRequired,
          suggestedKeepId: group.suggestedKeepId,
          partners: groupPartners,
        };
      }),
    );
  }
}
