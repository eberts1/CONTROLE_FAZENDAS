import { AnimalExpenseType, AnimalSaleType, FinanceSection, LedgerCategory, LedgerEntryType, LedgerScope } from './enums';

export function mapAnimalSaleToLedgerMeta(sale: {
  type: AnimalSaleType;
  eventId?: string | null;
  animalId: string;
}) {
  const geneticTypes = [
    AnimalSaleType.ASPIRACAO,
    AnimalSaleType.VENDA_SEMEN,
    AnimalSaleType.VENDA_EMBRIAO,
  ];
  const category = geneticTypes.includes(sale.type)
    ? LedgerCategory.VENDA_GENETICO
    : LedgerCategory.VENDA_ANIMAL;

  const scope =
    sale.eventId != null
      ? LedgerScope.ANIMAL_EVENTO
      : LedgerScope.ANIMAL;

  return {
    section: FinanceSection.PECUARIA_EVENTOS,
    type: LedgerEntryType.RECEITA,
    category,
    scope,
    eventId: sale.eventId ?? undefined,
    animalId: sale.animalId,
  };
}

export function mapAnimalExpenseToLedgerMeta(expense: {
  type: AnimalExpenseType;
  eventId?: string | null;
  animalId: string;
}) {
  const categoryMap: Record<AnimalExpenseType, LedgerCategory> = {
    [AnimalExpenseType.VETERINARIO]: LedgerCategory.VETERINARIO,
    [AnimalExpenseType.ALIMENTACAO]: LedgerCategory.ALIMENTACAO,
    [AnimalExpenseType.MANEJO]: LedgerCategory.MANUTENCAO,
    [AnimalExpenseType.REPRODUCAO]: LedgerCategory.REPRODUCAO,
    [AnimalExpenseType.OUTRO]: LedgerCategory.OUTRA_DESPESA,
  };

  const scope =
    expense.eventId != null
      ? LedgerScope.ANIMAL_EVENTO
      : LedgerScope.ANIMAL;

  return {
    section: FinanceSection.PECUARIA_EVENTOS,
    type: LedgerEntryType.DESPESA,
    category: categoryMap[expense.type],
    scope,
    eventId: expense.eventId ?? undefined,
    animalId: expense.animalId,
  };
}
