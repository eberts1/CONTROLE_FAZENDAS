import { AdBannerContentType } from '@controle-fazendas/shared';
import { buildEmbriaoPrompt } from './embriao.prompt';
import { buildSemenPrompt } from './semen.prompt';
import { buildAspiracaoPrompt } from './aspiracao.prompt';

export interface AdBannerPromptContext {
  contentType: AdBannerContentType;
  matrizTag?: string;
  reprodutorTag?: string;
  subtitle?: string;
}

const DEFAULT_SUBTITLE = 'Genética selecionada para acelerar resultados no rebanho.';

export function buildAdBannerPrompt(context: AdBannerPromptContext): string {
  const subtitle = context.subtitle?.trim() || DEFAULT_SUBTITLE;

  switch (context.contentType) {
    case AdBannerContentType.EMBRIAO:
      return buildEmbriaoPrompt({
        matrizTag: context.matrizTag ?? '',
        reprodutorTag: context.reprodutorTag ?? '',
        subtitle,
      });
    case AdBannerContentType.SEMEN:
      return buildSemenPrompt({
        reprodutorTag: context.reprodutorTag ?? '',
        subtitle,
      });
    case AdBannerContentType.ASPIRACAO:
      return buildAspiracaoPrompt({
        matrizTag: context.matrizTag ?? '',
        subtitle,
      });
    default:
      throw new Error(`Tipo de conteúdo não suportado: ${context.contentType}`);
  }
}
