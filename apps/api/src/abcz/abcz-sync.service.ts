import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AnimalSex } from '@prisma/client';
import { type AnimalAbczProfileDto, type AbczGeneticDepDto, type AbczProfilePreviewDto } from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { AbczClient } from './abcz.client';
import {
  canAccessAbczSection,
  parseCabecalhoHtml,
  parseEfficiencyHtml,
  parseGenealogyHtml,
  parseGeneticEvaluationHtml,
  parseReproductiveHtml,
} from './abcz.parser';

export interface AbczAnimalSyncInput {
  abczAnimalId: string;
  breedCode: number;
  categoryCode: number;
  sex: AnimalSex;
  serie: string;
  rgn: string;
  rgd: string;
  ownerId: string;
  allowsDetail: boolean;
  permiteConsulta?: string;
  sourceUrl?: string;
}

@Injectable()
export class AbczSyncService {
  private readonly logger = new Logger(AbczSyncService.name);
  private readonly sourceBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private client: AbczClient,
    config: ConfigService,
  ) {
    this.sourceBaseUrl = (config.get<string>('ABCZ_BASE_URL') ?? 'https://zebu.org.br').replace(/\/$/, '');
  }

  private sexLabel(sex: AnimalSex): string {
    return sex === AnimalSex.MACHO ? 'Macho' : 'Femea';
  }

  async fetchProfilePreview(input: AbczAnimalSyncInput): Promise<AbczProfilePreviewDto | null> {
    if (!input.allowsDetail) return null;

    const formParams = this.client.buildFormParams({
      abczAnimalId: input.abczAnimalId,
      breedCode: input.breedCode,
      categoryCode: input.categoryCode,
      sex: this.sexLabel(input.sex),
      serie: input.serie,
      rgn: input.rgn,
      rgd: input.rgd,
      ownerId: input.ownerId,
      allowsDetail: input.allowsDetail,
    });

    const [headerHtml, permissionsRaw] = await Promise.all([
      this.client.fetchAnimalHeader({
        abczAnimalId: input.abczAnimalId,
        breedCode: input.breedCode,
        categoryCode: input.categoryCode,
        sex: this.sexLabel(input.sex),
        serie: input.serie,
        rgn: input.rgn,
        rgd: input.rgd,
        ownerId: input.ownerId,
        allowsDetail: input.allowsDetail,
      }),
      this.client.fetchPermissions({
        abczAnimalId: input.abczAnimalId,
        breedCode: input.breedCode,
        categoryCode: input.categoryCode,
        sex: this.sexLabel(input.sex),
        serie: input.serie,
        rgn: input.rgn,
        rgd: input.rgd,
        ownerId: input.ownerId,
        allowsDetail: input.allowsDetail,
      }),
    ]);

    const header = parseCabecalhoHtml(headerHtml);
    const permissions = permissionsRaw;

    const fetches: Promise<{ key: string; html: string }>[] = [];

    if (canAccessAbczSection(permissions, 1)) {
      fetches.push(
        this.client.fetchPartial('PreencheGenealogiaDoAnimal', formParams).then((html) => ({
          key: 'genealogy',
          html,
        })),
      );
    }
    if (canAccessAbczSection(permissions, 2)) {
      fetches.push(
        this.client.fetchPartial('DadosReprodutivos', formParams).then((html) => ({
          key: 'reproductive',
          html,
        })),
      );
    }
    if (canAccessAbczSection(permissions, 3)) {
      fetches.push(
        this.client
          .fetchPartial('RetornaAvaliacaoGeneticaDoAnimal', formParams)
          .then((html) => ({ key: 'genetic', html })),
      );
    }
    if (canAccessAbczSection(permissions, 2)) {
      fetches.push(
        this.client
          .fetchPartial('RetornaEficienciaReprodutivaDoAnimal', formParams)
          .then((html) => ({ key: 'efficiency', html })),
      );
    }

    const results = await Promise.all(fetches);
    const byKey = Object.fromEntries(results.map((r) => [r.key, r.html]));

    const genealogy = byKey.genealogy ? parseGenealogyHtml(byKey.genealogy) : [];
    const reproductive = byKey.reproductive
      ? parseReproductiveHtml(byKey.reproductive)
      : { message: null, rows: null };
    const geneticEvaluations = byKey.genetic ? parseGeneticEvaluationHtml(byKey.genetic) : [];
    const efficiencyMessage = byKey.efficiency ? parseEfficiencyHtml(byKey.efficiency) : null;

    return {
      permissions,
      header: {
        coat: header.coat,
        city: header.city,
        state: header.state,
        situation: header.situation,
        owner: header.owner,
        farm: header.farm,
        breeder: header.breeder,
      },
      genealogy: genealogy.map((entry) => ({
        relationship: entry.relationship,
        registration: entry.registration,
        name: entry.name,
        abczAnimalId: entry.abczAnimalId,
        generation: entry.generation >= 0 ? entry.generation : null,
        slot: entry.generation >= 0 ? entry.slot : null,
      })),
      geneticEvaluations: geneticEvaluations.map((evaluation) => ({
        period: evaluation.period,
        evaluationKind: evaluation.evaluationKind,
        iabcz: evaluation.iabcz,
        deca: evaluation.deca,
        inbreedingF: evaluation.inbreedingF,
        deps: evaluation.deps,
      })),
      reproductiveMessage: reproductive.message,
      reproductiveData: reproductive.rows,
      efficiencyMessage,
    };
  }

  async saveProfileSnapshot(
    animalId: string,
    profile: AbczProfilePreviewDto,
    sourceUrl?: string,
  ): Promise<void> {
    const fetchedAt = new Date();
    const resolvedSourceUrl = sourceUrl ?? `${this.sourceBaseUrl}/ConsultaIndividual`;
    const header = profile.header ?? {
      coat: null,
      city: null,
      state: null,
      situation: null,
      owner: null,
      farm: null,
      breeder: null,
    };
    const genealogy = profile.genealogy ?? [];
    const geneticEvaluations = profile.geneticEvaluations ?? [];

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.animalAbczSnapshot.findUnique({ where: { animalId } });
      if (existing) {
        await tx.animalGenealogyEntry.deleteMany({ where: { snapshotId: existing.id } });
        await tx.animalGeneticEvaluation.deleteMany({ where: { snapshotId: existing.id } });
        await tx.animalAbczSnapshot.delete({ where: { id: existing.id } });
      }

      const snapshot = await tx.animalAbczSnapshot.create({
        data: {
          animalId,
          permissions: profile.permissions,
          fetchedAt,
          sourceUrl: resolvedSourceUrl,
          coat: header.coat,
          city: header.city,
          state: header.state,
          situation: header.situation,
          owner: header.owner,
          farmName: header.farm,
          breeder: header.breeder,
          reproductiveMessage: profile.reproductiveMessage,
          efficiencyMessage: profile.efficiencyMessage,
          reproductiveData:
            profile.reproductiveData && profile.reproductiveData.length > 0
              ? (profile.reproductiveData as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      if (genealogy.length > 0) {
        await tx.animalGenealogyEntry.createMany({
          data: genealogy.map((entry, index) => ({
            animalId,
            snapshotId: snapshot.id,
            relationship: entry.relationship,
            registration: entry.registration,
            name: entry.name,
            abczAnimalId: entry.abczAnimalId,
            generation: entry.generation,
            slot: entry.slot,
            sortOrder: index,
          })),
        });
      }

      if (geneticEvaluations.length > 0) {
        await tx.animalGeneticEvaluation.createMany({
          data: geneticEvaluations.map((evaluation) => ({
            animalId,
            snapshotId: snapshot.id,
            period: evaluation.period,
            evaluationKind: evaluation.evaluationKind,
            iabcz: evaluation.iabcz,
            deca: evaluation.deca,
            inbreedingF: evaluation.inbreedingF,
            deps: evaluation.deps as unknown as Prisma.InputJsonValue,
          })),
        });
      }

      const animalRow = await tx.animal.findUnique({
        where: { id: animalId },
        select: { pelagem: true },
      });

      await tx.animal.update({
        where: { id: animalId },
        data: {
          abczSyncedAt: fetchedAt,
          ...(!animalRow?.pelagem?.trim() && header.coat ? { pelagem: header.coat } : {}),
        },
      });
    });

    this.logger.log(`Perfil ABCZ gravado no banco para animal ${animalId}`);
  }

  async syncForAnimal(animalId: string, input: AbczAnimalSyncInput): Promise<void> {
    const profile = await this.fetchProfilePreview(input);
    if (!profile) return;
    await this.saveProfileSnapshot(animalId, profile, input.sourceUrl);
  }

  async getProfile(farmId: string, animalId: string): Promise<AnimalAbczProfileDto | null> {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmId },
      include: {
        abczSnapshot: {
          include: {
            genealogy: { orderBy: { sortOrder: 'asc' } },
            geneticEvaluations: true,
          },
        },
      },
    });

    if (!animal?.abczSnapshot) return null;

    const snapshot = animal.abczSnapshot;
    const reproductiveData = snapshot.reproductiveData as { label: string; value: string }[] | null;

    return {
      animalId: animal.id,
      registration:
        animal.abczSerie && animal.abczRgn ? `${animal.abczSerie} ${animal.abczRgn}` : null,
      permissions: snapshot.permissions,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      sourceUrl: snapshot.sourceUrl,
      header: {
        coat: snapshot.coat,
        city: snapshot.city,
        state: snapshot.state,
        situation: snapshot.situation,
        owner: snapshot.owner,
        farm: snapshot.farmName,
        breeder: snapshot.breeder,
      },
      genealogy: snapshot.genealogy.map((entry) => ({
        id: entry.id,
        relationship: entry.relationship,
        registration: entry.registration,
        name: entry.name,
        abczAnimalId: entry.abczAnimalId,
        generation: 'generation' in entry ? (entry as { generation: number | null }).generation : null,
        slot: 'slot' in entry ? (entry as { slot: number | null }).slot : null,
      })),
      geneticEvaluations: snapshot.geneticEvaluations.map(
        (evaluation: (typeof snapshot.geneticEvaluations)[number]) => ({
        id: evaluation.id,
        period: evaluation.period,
        evaluationKind: evaluation.evaluationKind,
        iabcz: evaluation.iabcz,
        deca: evaluation.deca,
        inbreedingF: evaluation.inbreedingF,
        deps: (evaluation.deps as unknown as AbczGeneticDepDto[]) ?? [],
      }),
      ),
      reproductiveMessage: snapshot.reproductiveMessage,
      reproductiveData,
      efficiencyMessage: snapshot.efficiencyMessage,
    };
  }
}
