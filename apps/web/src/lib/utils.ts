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
