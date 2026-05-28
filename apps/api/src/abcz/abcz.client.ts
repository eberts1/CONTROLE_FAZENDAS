import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AbczClient {
  private readonly logger = new Logger(AbczClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private sessionCookies: string | null = null;
  private sessionExpiresAt = 0;

  constructor(private config: ConfigService) {
    this.baseUrl = (config.get<string>('ABCZ_BASE_URL') ?? 'https://zebu.org.br').replace(/\/$/, '');
    this.timeoutMs = Number(config.get<string>('ABCZ_REQUEST_TIMEOUT_MS') ?? 20_000);
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private mergeCookies(existing: string | null, response: Response): string {
    const raw = response.headers.getSetCookie?.() ?? [];
    const parsed = raw
      .map((entry) => entry.split(';')[0]?.trim())
      .filter(Boolean) as string[];

    if (!parsed.length) return existing ?? '';

    const jar = new Map<string, string>();
    for (const part of (existing ?? '').split(';')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key) jar.set(key, rest.join('='));
    }
    for (const cookie of parsed) {
      const [key, ...rest] = cookie.split('=');
      if (key) jar.set(key, rest.join('='));
    }
    return Array.from(jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionCookies && Date.now() < this.sessionExpiresAt) return;

    const response = await this.fetchWithTimeout(`${this.baseUrl}/ConsultaIndividual`, {
      method: 'GET',
      headers: {
        'User-Agent': 'ControleFazendas/1.0 (+https://github.com)',
        Accept: 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao abrir sessão ABCZ (${response.status})`);
    }

    this.sessionCookies = this.mergeCookies(null, response);
    this.sessionExpiresAt = Date.now() + 10 * 60 * 1000;
    await response.text();
  }

  private async postForm(path: string, body: Record<string, string>): Promise<string> {
    await this.ensureSession();

    const form = new URLSearchParams(body);
    const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ControleFazendas/1.0 (+https://github.com)',
        Accept: 'text/html,application/json',
        Cookie: this.sessionCookies ?? '',
      },
      body: form.toString(),
    });

    this.sessionCookies = this.mergeCookies(this.sessionCookies, response);
    const text = await response.text();
    if (!response.ok) {
      this.logger.warn(`ABCZ POST ${path} status ${response.status}`);
      throw new Error(`Consulta ABCZ falhou (${response.status})`);
    }
    return text;
  }

  private async postJson(path: string, payload: Record<string, string>): Promise<string> {
    await this.ensureSession();

    const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'ControleFazendas/1.0 (+https://github.com)',
        Accept: 'application/json',
        Cookie: this.sessionCookies ?? '',
      },
      body: JSON.stringify(payload),
    });

    this.sessionCookies = this.mergeCookies(this.sessionCookies, response);
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Consulta ABCZ falhou (${response.status})`);
    }
    return text;
  }

  async searchBySerie(serie: string, rgn: string, rgnFinal?: string): Promise<string> {
    const final = rgnFinal?.trim() || rgn;
    return this.postForm('/ConsultaIndividual/BuscaSerie', {
      TipoDeConsulta: 'SerieUnica',
      Rgd: serie.trim().toUpperCase(),
      rgninicial: rgn.trim(),
      rgnfinal: final.trim(),
    });
  }

  async searchByRgd(params: {
    breedId: number;
    categoryId: number;
    sex: 'M' | 'F';
    rgd: string;
    rgdFinal?: string;
  }): Promise<string> {
    const final = params.rgdFinal?.trim() || params.rgd;
    return this.postForm('/ConsultaIndividual/BuscaSerie', {
      TipoDeConsulta: 'Rgd',
      IdRaca: String(params.breedId),
      Racas: String(params.breedId),
      IdCategoria: String(params.categoryId),
      Categorias: String(params.categoryId),
      DropDownSexoDoAnimal: params.sex,
      DescricaoDoSexoDoAnimal: params.sex,
      rgdinicial: params.rgd.trim(),
      rgdfinal: final.trim(),
    });
  }

  async fetchAnimalHeader(params: {
    abczAnimalId: string;
    breedCode: number;
    categoryCode: number;
    sex: string;
    serie: string;
    rgn: string;
    rgd: string;
    ownerId: string;
    allowsDetail: boolean;
  }): Promise<string> {
    return this.fetchPartial('CabecalhoDoAnimal', this.buildFormParams(params));
  }

  buildFormParams(params: {
    abczAnimalId: string;
    breedCode: number;
    categoryCode: number;
    sex: string;
    serie: string;
    rgn: string;
    rgd: string;
    ownerId: string;
    allowsDetail: boolean;
    permiteConsulta?: string;
  }): Record<string, string> {
    const sexLabel = params.sex.toLowerCase().includes('macho') ? 'Macho' : 'Femea';
    const perm =
      params.permiteConsulta?.toUpperCase() ?? (params.allowsDetail ? 'S' : 'N');
    return {
      Ordem: params.abczAnimalId,
      Raca: String(params.breedCode),
      Categoria: String(params.categoryCode),
      Sexo: sexLabel,
      Serie: params.serie,
      Rgn: params.rgn,
      Rgd: params.rgd,
      Proprietario: params.ownerId,
      PermiteConsulta: perm === 'N' ? 'N' : perm,
    };
  }

  async fetchPartial(path: string, params: Record<string, string>): Promise<string> {
    return this.postForm(`/ConsultaIndividual/${path}`, params);
  }

  async fetchPermissions(params: {
    abczAnimalId: string;
    breedCode: number;
    categoryCode: number;
    sex: string;
    serie: string;
    rgn: string;
    rgd: string;
    ownerId: string;
    allowsDetail: boolean;
  }): Promise<string | null> {
    const sexLabel = params.sex.toLowerCase().includes('macho') ? 'Macho' : 'Femea';
    try {
      const raw = await this.postJson('/ConsultaIndividual/BuscaDetalhesDoAnimal', {
        Ordem: params.abczAnimalId,
        Raca: String(params.breedCode),
        Categoria: String(params.categoryCode),
        Sexo: sexLabel,
        Serie: params.serie,
        Rgn: params.rgn,
        Rgd: params.rgd,
        Proprietario: params.ownerId,
        PermiteConsulta: params.allowsDetail ? 'S' : 'N',
      });
      return raw.replace(/^"|"$/g, '');
    } catch {
      return null;
    }
  }
}
