import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AbczLookupQuery,
  type AbczLookupResult,
  type AbczPreviewQuery,
  type AbczProfilePreviewDto,
  AnimalSex,
} from '@controle-fazendas/shared';
import { AbczClient } from './abcz.client';
import { hasSearchResults, parseBuscaSerieHtml, parseCabecalhoHtml } from './abcz.parser';
import { AbczSyncService } from './abcz-sync.service';

interface CacheEntry {
  expiresAt: number;
  value: AbczLookupResult;
}

@Injectable()
export class AbczService {
  private readonly logger = new Logger(AbczService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;
  private readonly sourceBaseUrl: string;

  constructor(
    private client: AbczClient,
    private abczSync: AbczSyncService,
    config: ConfigService,
  ) {
    this.cacheTtlMs = Number(config.get<string>('ABCZ_CACHE_TTL_MS') ?? 86_400_000);
    this.sourceBaseUrl = (config.get<string>('ABCZ_BASE_URL') ?? 'https://zebu.org.br').replace(/\/$/, '');
  }

  private cacheKey(query: AbczLookupQuery): string {
    if (query.mode === 'serie') {
      return `serie:${query.serie.toUpperCase()}:${query.rgn}:${query.rgnFinal ?? query.rgn}`;
    }
    return `rgd:${query.breedId}:${query.categoryId}:${query.sex}:${query.rgd}:${query.rgdFinal ?? query.rgd}`;
  }

  private candidateSyncInput(candidate: ReturnType<typeof parseBuscaSerieHtml>[number]) {
    return {
      abczAnimalId: candidate.abczAnimalId,
      breedCode: candidate.breedCode,
      categoryCode: candidate.categoryCode,
      sex: candidate.sex,
      serie: candidate.serie,
      rgn: candidate.rgn,
      rgd: candidate.rgd,
      ownerId: candidate.ownerId,
      allowsDetail: candidate.allowsDetail,
      permiteConsulta: candidate.permiteConsulta,
    };
  }

  async preview(query: AbczPreviewQuery): Promise<AbczProfilePreviewDto | null> {
    const key = `preview:${query.abczAnimalId}:${query.serie}:${query.rgn}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value.profile;
    }

    const profile = await this.abczSync.fetchProfilePreview({
      abczAnimalId: query.abczAnimalId,
      breedCode: query.breedCode,
      categoryCode: query.categoryCode,
      sex: query.sex,
      serie: query.serie,
      rgn: query.rgn,
      rgd: query.rgd,
      ownerId: query.ownerId,
      allowsDetail: query.allowsDetail ?? true,
    });

    if (profile) {
      this.cache.set(key, {
        value: {
          found: true,
          multiple: false,
          candidates: [],
          detail: profile.header,
          profile,
          permissions: profile.permissions,
          fetchedAt: new Date().toISOString(),
          sourceUrl: `${this.sourceBaseUrl}/ConsultaIndividual`,
        },
        expiresAt: Date.now() + this.cacheTtlMs,
      });
    }

    return profile;
  }

  async lookup(query: AbczLookupQuery): Promise<AbczLookupResult> {
    const key = this.cacheKey(query);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const html =
        query.mode === 'serie'
          ? await this.client.searchBySerie(query.serie, query.rgn, query.rgnFinal)
          : await this.client.searchByRgd({
              breedId: query.breedId,
              categoryId: query.categoryId,
              sex: query.sex,
              rgd: query.rgd,
              rgdFinal: query.rgdFinal,
            });

      const fetchedAt = new Date().toISOString();
      const sourceUrl = `${this.sourceBaseUrl}/ConsultaIndividual`;

      if (!hasSearchResults(html)) {
        const empty: AbczLookupResult = {
          found: false,
          multiple: false,
          candidates: [],
          detail: null,
          profile: null,
          permissions: null,
          fetchedAt,
          sourceUrl,
        };
        this.cache.set(key, { value: empty, expiresAt: Date.now() + this.cacheTtlMs });
        return empty;
      }

      const candidates = parseBuscaSerieHtml(html);
      let detail = null;
      let permissions: string | null = null;
      let profile: AbczProfilePreviewDto | null = null;

      if (candidates.length === 1 && candidates[0].abczAnimalId) {
        const candidate = candidates[0];
        profile = candidate.allowsDetail
          ? await this.abczSync.fetchProfilePreview(this.candidateSyncInput(candidate))
          : null;
        if (profile) {
          detail = profile.header;
          permissions = profile.permissions;
        } else {
          const sexParam = candidate.sex === AnimalSex.MACHO ? 'Macho' : 'Femea';
          const headerParams = {
            abczAnimalId: candidate.abczAnimalId,
            breedCode: candidate.breedCode,
            categoryCode: candidate.categoryCode,
            sex: sexParam,
            serie: candidate.serie,
            rgn: candidate.rgn,
            rgd: candidate.rgd,
            ownerId: candidate.ownerId,
            allowsDetail: candidate.allowsDetail,
          };

          const [headerHtml, perms] = await Promise.all([
            this.client.fetchAnimalHeader(headerParams),
            this.client.fetchPermissions(headerParams),
          ]);
          detail = parseCabecalhoHtml(headerHtml);
          permissions = perms;
        }
      }

      const result: AbczLookupResult = {
        found: candidates.length > 0,
        multiple: candidates.length > 1,
        candidates,
        detail,
        profile,
        permissions,
        fetchedAt,
        sourceUrl,
      };

      this.cache.set(key, { value: result, expiresAt: Date.now() + this.cacheTtlMs });
      return result;
    } catch (error) {
      this.logger.error('Erro na consulta ABCZ', error);
      throw new BadGatewayException(
        'Não foi possível consultar a base pública da ABCZ. Tente novamente em instantes.',
      );
    }
  }
}
