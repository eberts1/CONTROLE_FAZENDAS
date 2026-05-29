import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ImageReference } from './providers/gemini-image.client';

const ASSET_DIR = join(__dirname, 'assets');

@Injectable()
export class HubLogoLoader {
  private readonly logger = new Logger(HubLogoLoader.name);

  loadLogoReference(): ImageReference | null {
    const candidates = [
      { path: join(ASSET_DIR, 'hub-fazendas-logo.png'), mimeType: 'image/png' },
      { path: join(ASSET_DIR, 'hub-fazendas-logo.svg'), mimeType: 'image/svg+xml' },
    ];

    for (const candidate of candidates) {
      if (!existsSync(candidate.path)) continue;

      try {
        const data = readFileSync(candidate.path);
        this.logger.debug(`Logo Hub Fazendas carregado: ${candidate.path}`);
        return { mimeType: candidate.mimeType, data };
      } catch (error) {
        this.logger.warn(`Falha ao carregar logo: ${candidate.path}`);
      }
    }

    this.logger.warn('Logo Hub Fazendas não encontrado em assets/');
    return null;
  }
}
