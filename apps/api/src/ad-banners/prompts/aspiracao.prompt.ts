import { HUB_FAZENDAS_VISUAL_STYLE } from './shared.prompt';

export interface AspiracaoPromptParams {
  matrizTag: string;
  subtitle: string;
}

export function buildAspiracaoPrompt(params: AspiracaoPromptParams): string {
  return `
Crie uma arte publicitária premium para anúncio de aspiração de embriões bovinos no Hub Fazendas.

A peça deve transmitir exclusividade, confiança, melhoramento genético e oportunidade de investimento.

Use a foto de referência fornecida como MATRIZ de elite. Mantenha fidelidade anatômica e realismo fotográfico do animal.

Composição:
Matriz em destaque central ou à esquerda, em pose elegante e imponente.
Fundo com efeitos de partículas douradas, DNA e fluxos genéticos elegantes.
Elementos visuais que remetam a aspiração e material genético de alta qualidade.

Título Principal (texto exato):
OFERTA DE ASPIRAÇÃO

Subtítulo (texto exato):
Matriz de elite com material genético disponível para investimento.

Informação em destaque (texto exato):
MATRIZ ${params.matrizTag}

Mensagem comercial:
Disponível no Hub Fazendas
${params.subtitle}

${HUB_FAZENDAS_VISUAL_STYLE}

Elite dam aspiration offer, premium cattle genetics campaign, single cow hero composition.
`.trim();
}
