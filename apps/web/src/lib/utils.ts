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
