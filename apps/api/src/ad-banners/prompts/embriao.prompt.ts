import { HUB_FAZENDAS_VISUAL_STYLE } from './shared.prompt';

export interface EmbriaoPromptParams {
  matrizTag: string;
  reprodutorTag: string;
  subtitle: string;
}

export function buildEmbriaoPrompt(params: EmbriaoPromptParams): string {
  return `
Crie uma arte publicitária premium para anúncio de embrião bovino no Hub Fazendas.

A peça deve transmitir exclusividade, confiança, melhoramento genético e oportunidade de investimento.

O foco principal é destacar o acasalamento entre uma matriz e um reprodutor de elite.

Use as fotos de referência fornecidas: a primeira foto é a MATRIZ (posicionar à esquerda), a segunda foto é o REPRODUTOR (posicionar à direita). Mantenha fidelidade anatômica e realismo fotográfico dos animais.

Composição:
Matriz posicionada à esquerda.
Reprodutor posicionado à direita.
Centro da arte reservado para representar a genética resultante do acasalamento.
Conectar visualmente os dois animais através de linhas de DNA, partículas luminosas e fluxos genéticos elegantes.

Elemento central:
Um símbolo sofisticado de embrião ou DNA dourado representando a futura progênie.
A conexão genética deve ser o principal elemento visual da composição.

Título Principal (texto exato):
OFERTA DE EMBRIÃO

Subtítulo (texto exato):
O melhor da genética reunido em um único acasalamento.

Informações em destaque (texto exato):
MATRIZ ${params.matrizTag}
X
REPRODUTOR ${params.reprodutorTag}

Mensagem comercial:
Disponível no Hub Fazendas
${params.subtitle}

${HUB_FAZENDAS_VISUAL_STYLE}

DNA connection effect between the two reference animals, golden embryo symbol at center.
`.trim();
}
