import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
}

export const areaTypeLabels: Record<string, string> = {
  PASTO: 'Pasto',
  TALHAO: 'Talhão',
  GALPAO: 'Galpão',
  OUTRO: 'Outro',
};

export const processCategoryLabels: Record<string, string> = {
  PLANTIO: 'Plantio',
  COLHEITA: 'Colheita',
  MANEJO: 'Manejo',
  IRRIGACAO: 'Irrigação',
  OUTRO: 'Outro',
};

export const animalSexLabels: Record<string, string> = {
  MACHO: 'Macho',
  FEMEA: 'Fêmea',
};

export const animalStatusLabels: Record<string, string> = {
  ATIVO: 'Ativo',
  VENDIDO: 'Vendido',
  MORTO: 'Morto',
  OUTRO: 'Outro',
};

export const geneticMaterialTypeLabels: Record<string, string> = {
  SEMEN: 'Sêmen',
  EMBRIAO: 'Embrião',
};

export const adBannerContentTypeLabels: Record<string, string> = {
  EMBRIAO: 'Embrião',
  SEMEN: 'Sêmen',
  ASPIRACAO: 'Aspiração',
};

export const adBannerAspectRatioLabels: Record<string, string> = {
  '16:9': 'Banner 16:9 (paisagem)',
  '4:5': 'Feed 4:5 (Instagram)',
};

export const AD_BANNER_COMMERCIAL_CUSTOM = '__custom__';

export const adBannerCommercialMessages = [
  {
    value: 'genetica-selecionada',
    label: 'Genética selecionada',
    text: 'Genética selecionada para acelerar resultados no rebanho.',
  },
  {
    value: 'investimento-elite',
    label: 'Investimento em elite',
    text: 'Investimento em genética de elite para o seu projeto pecuário.',
  },
  {
    value: 'disponivel-hub',
    label: 'Disponível no Hub',
    text: 'Disponível agora no Hub Fazendas.',
  },
  {
    value: 'melhoramento-genetico',
    label: 'Melhoramento genético',
    text: 'Oportunidade única de melhoramento genético para o seu rebanho.',
  },
  {
    value: 'qualidade-campo',
    label: 'Qualidade comprovada',
    text: 'Qualidade comprovada, resultados no campo.',
  },
  {
    value: 'genetica-premium',
    label: 'Genética premium',
    text: 'Genética premium para quem busca excelência.',
  },
  {
    value: 'proxima-geracao',
    label: 'Próxima geração',
    text: 'Garanta a próxima geração do seu rebanho com genética de ponta.',
  },
  {
    value: 'potencial-comprovado',
    label: 'Potencial comprovado',
    text: 'Potencial genético comprovado em progênie de elite.',
  },
] as const;

export const adBannerDefaultCommercialMessage = adBannerCommercialMessages[0].text;

export function resolveAdBannerCommercialSelection(subtitle?: string): string {
  const trimmed = subtitle?.trim();
  if (!trimmed) return adBannerCommercialMessages[0].value;

  const match = adBannerCommercialMessages.find((preset) => preset.text === trimmed);
  return match?.value ?? AD_BANNER_COMMERCIAL_CUSTOM;
}

export const stockMovementTypeLabels: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste de saldo',
};

export function formatDateOnly(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(date));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export const animalSaleTypeLabels: Record<string, string> = {
  ASPIRACAO: 'Aspiração',
  VENDA_ANIMAL: 'Venda do animal / cota',
  VENDA_SEMEN: 'Venda de sêmen',
  VENDA_EMBRIAO: 'Venda de embrião',
  SERVICO_ACASALAMENTO: 'Serviço de acasalamento',
  OUTRO: 'Outro',
};

export const farmEventTypeLabels: Record<string, string> = {
  LEILAO: 'Leilão',
  VENDA_EXTERNA: 'Venda externa',
  VENDA_FAZENDA: 'Venda na fazenda',
  OUTRO: 'Outro',
};

export const farmEventStatusLabels: Record<string, string> = {
  PLANEJADO: 'Planejado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export const ledgerSourceLabels: Record<string, string> = {
  MANUAL: 'Manual',
  ANIMAL_SALE: 'Venda do animal',
  ANIMAL_EXPENSE: 'Despesa do animal',
  RECORRENTE: 'Conta recorrente',
  FOLHA_PAGAMENTO: 'Folha de pagamento',
};

export const saleAssetScopeLabels: Record<string, string> = {
  PRODUTO_GENETICO: 'Produto genético',
  SERVICO_REPRODUTIVO: 'Serviço reprodutivo',
  COTA_ANIMAL: 'Cota do animal',
  ANIMAL_INTEIRO: 'Animal inteiro (100%)',
};

export const paymentConditionLabels: Record<string, string> = {
  A_VISTA: 'À vista',
  PARCELADO: 'Parcelado',
};

export const animalExpenseTypeLabels: Record<string, string> = {
  VETERINARIO: 'Veterinário',
  ALIMENTACAO: 'Alimentação',
  MANEJO: 'Manejo',
  REPRODUCAO: 'Reprodução',
  OUTRO: 'Outro',
};

export const animalManagementCategoryLabels: Record<string, string> = {
  SAUDE: 'Saúde',
  REPRODUTIVO: 'Reprodutivo',
  NUTRICAO: 'Nutrição',
  MANEJO_GERAL: 'Manejo geral',
};

export const animalManagementEventTypeLabels: Record<string, string> = {
  OBSERVACAO_CLINICA: 'Observação clínica',
  TRATAMENTO_DOENCA: 'Tratamento / doença',
  MEDICACAO: 'Medicação',
  VACINACAO: 'Vacinação',
  EXAME: 'Exame',
  INSEMINACAO: 'Inseminação',
  DOADOR_INSEMINACAO: 'Usado em inseminação',
  MONTA_NATURAL: 'Monta natural',
  DIAGNOSTICO_GESTACAO: 'Diagnóstico de gestação',
  PARTO_ABORTO: 'Parto / aborto',
  SUPLEMENTACAO: 'Suplementação',
  MUDANCA_DIETA: 'Mudança de dieta',
  PESAGEM: 'Pesagem',
  MOVIMENTACAO: 'Movimentação',
  IDENTIFICACAO: 'Identificação / marcação',
  OUTRO: 'Outro',
};

export const gestationResultLabels: Record<string, string> = {
  POSITIVO: 'Positivo',
  NEGATIVO: 'Negativo',
  INDETERMINADO: 'Indeterminado',
};
