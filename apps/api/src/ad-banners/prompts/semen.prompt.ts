import { HUB_FAZENDAS_VISUAL_STYLE } from './shared.prompt';

export interface SemenPromptParams {
  reprodutorTag: string;
  subtitle: string;
}

export function buildSemenPrompt(params: SemenPromptParams): string {
  return `
Crie uma arte publicitária premium para anúncio de sêmen bovino no Hub Fazendas.

A peça deve transmitir exclusividade, confiança, melhoramento genético e oportunidade de investimento.

Use a foto de referência fornecida como REPRODUTOR de elite. Mantenha fidelidade anatômica e realismo fotográfico do animal.

Composição:
Reprodutor em destaque central ou à direita, em pose heroica e imponente.
Fundo com efeitos de partículas douradas, DNA e fluxos genéticos elegantes.
Elementos visuais que remetam a material genético de alta qualidade (ícones de sêmen, DNA).

Título Principal (texto exato):
OFERTA DE SÊMEN

Subtítulo (texto exato):
Genética de elite disponível para acelerar o melhoramento do seu rebanho.

Informação em destaque (texto exato):
REPRODUTOR ${params.reprodutorTag}

Mensagem comercial:
Disponível no Hub Fazendas
${params.subtitle}

${HUB_FAZENDAS_VISUAL_STYLE}

Elite bull semen offer, premium cattle genetics campaign, single sire hero composition.
`.trim();
}
