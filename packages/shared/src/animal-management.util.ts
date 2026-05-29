import {
  AnimalExpenseType,
  AnimalManagementCategory,
  AnimalManagementEventType,
} from './enums';

const EVENT_TYPES_BY_CATEGORY: Record<
  AnimalManagementCategory,
  AnimalManagementEventType[]
> = {
  [AnimalManagementCategory.SAUDE]: [
    AnimalManagementEventType.OBSERVACAO_CLINICA,
    AnimalManagementEventType.TRATAMENTO_DOENCA,
    AnimalManagementEventType.MEDICACAO,
    AnimalManagementEventType.VACINACAO,
    AnimalManagementEventType.EXAME,
  ],
  [AnimalManagementCategory.REPRODUTIVO]: [
    AnimalManagementEventType.INSEMINACAO,
    AnimalManagementEventType.DOADOR_INSEMINACAO,
    AnimalManagementEventType.MONTA_NATURAL,
    AnimalManagementEventType.DIAGNOSTICO_GESTACAO,
    AnimalManagementEventType.PARTO_ABORTO,
  ],
  [AnimalManagementCategory.NUTRICAO]: [
    AnimalManagementEventType.SUPLEMENTACAO,
    AnimalManagementEventType.MUDANCA_DIETA,
  ],
  [AnimalManagementCategory.MANEJO_GERAL]: [
    AnimalManagementEventType.PESAGEM,
    AnimalManagementEventType.MOVIMENTACAO,
    AnimalManagementEventType.IDENTIFICACAO,
    AnimalManagementEventType.OUTRO,
  ],
};

const CATEGORY_FOR_EVENT_TYPE = new Map<AnimalManagementEventType, AnimalManagementCategory>();
for (const [category, types] of Object.entries(EVENT_TYPES_BY_CATEGORY)) {
  for (const eventType of types) {
    CATEGORY_FOR_EVENT_TYPE.set(
      eventType,
      category as AnimalManagementCategory,
    );
  }
}

export function getEventTypesForCategory(
  category: AnimalManagementCategory,
): AnimalManagementEventType[] {
  return EVENT_TYPES_BY_CATEGORY[category];
}

export function getCategoryForEventType(
  eventType: AnimalManagementEventType,
): AnimalManagementCategory | undefined {
  return CATEGORY_FOR_EVENT_TYPE.get(eventType);
}

export function isEventTypeValidForCategory(
  category: AnimalManagementCategory,
  eventType: AnimalManagementEventType,
): boolean {
  return EVENT_TYPES_BY_CATEGORY[category].includes(eventType);
}

export function defaultExpenseTypeForCategory(
  category: AnimalManagementCategory,
): AnimalExpenseType {
  const map: Record<AnimalManagementCategory, AnimalExpenseType> = {
    [AnimalManagementCategory.SAUDE]: AnimalExpenseType.VETERINARIO,
    [AnimalManagementCategory.REPRODUTIVO]: AnimalExpenseType.REPRODUCAO,
    [AnimalManagementCategory.NUTRICAO]: AnimalExpenseType.ALIMENTACAO,
    [AnimalManagementCategory.MANEJO_GERAL]: AnimalExpenseType.MANEJO,
  };
  return map[category];
}

export const REPRODUCTIVE_EVENT_TYPES_WITH_RELATED_ANIMAL: AnimalManagementEventType[] = [
  AnimalManagementEventType.INSEMINACAO,
  AnimalManagementEventType.DOADOR_INSEMINACAO,
  AnimalManagementEventType.MONTA_NATURAL,
];

export function eventTypeRequiresRelatedAnimal(
  eventType: AnimalManagementEventType,
): boolean {
  return REPRODUCTIVE_EVENT_TYPES_WITH_RELATED_ANIMAL.includes(eventType);
}
