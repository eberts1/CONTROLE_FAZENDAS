export interface IdentityGenealogyEntry {
  relationship: string;
  registration: string;
  name: string;
  abczAnimalId?: string | null;
  generation?: number | null;
  slot?: number | null;
}

export interface AnimalIdentityInput {
  tag: string;
  name?: string | null;
  abczAnimalId?: string | null;
  abczSerie?: string | null;
  abczRgn?: string | null;
  genealogy?: IdentityGenealogyEntry[];
}

export interface IdentityKeys {
  abczAnimalIds: string[];
  registrations: string[];
  names: string[];
  tags: string[];
}

/** Normaliza texto para comparação (registro, nome, tag). */
export function normalizeIdentity(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pushUnique(target: string[], value: string | null | undefined) {
  const normalized = normalizeIdentity(value);
  if (normalized && !target.includes(normalized)) {
    target.push(normalized);
  }
}

export function buildGenealogyKey(entry: {
  registration: string;
  name: string;
  abczAnimalId?: string | null;
}): string {
  const parts = [
    normalizeIdentity(entry.registration),
    normalizeIdentity(entry.name),
    entry.abczAnimalId?.trim() ?? '',
  ].filter(Boolean);
  return parts.join('|') || normalizeIdentity(entry.name) || normalizeIdentity(entry.registration);
}

export function buildIdentityKeys(input: AnimalIdentityInput): IdentityKeys {
  const keys: IdentityKeys = {
    abczAnimalIds: [],
    registrations: [],
    names: [],
    tags: [],
  };

  pushUnique(keys.tags, input.tag);
  pushUnique(keys.names, input.name);
  if (input.abczAnimalId?.trim()) {
    keys.abczAnimalIds.push(input.abczAnimalId.trim());
  }

  if (input.abczSerie && input.abczRgn) {
    pushUnique(keys.registrations, `${input.abczSerie} ${input.abczRgn}`);
    pushUnique(keys.registrations, `${input.abczSerie}-${input.abczRgn}`);
  }

  for (const entry of input.genealogy ?? []) {
    if (entry.relationship === 'ANIMAL') {
      pushUnique(keys.registrations, entry.registration);
      pushUnique(keys.names, entry.name);
      if (entry.abczAnimalId?.trim()) {
        keys.abczAnimalIds.push(entry.abczAnimalId.trim());
      }
    }
  }

  return keys;
}

export function identitiesMatch(
  anchorKeys: IdentityKeys,
  entry: IdentityGenealogyEntry,
): boolean {
  const entryAbczId = entry.abczAnimalId?.trim();
  if (entryAbczId && anchorKeys.abczAnimalIds.includes(entryAbczId)) {
    return true;
  }

  const entryRegistration = normalizeIdentity(entry.registration);
  if (entryRegistration && anchorKeys.registrations.includes(entryRegistration)) {
    return true;
  }

  const entryName = normalizeIdentity(entry.name);
  if (entryName && anchorKeys.names.includes(entryName)) {
    return true;
  }

  if (entryRegistration && anchorKeys.tags.includes(entryRegistration)) {
    return true;
  }

  if (entryName && anchorKeys.tags.includes(entryName)) {
    return true;
  }

  return false;
}

export function isImmediateParentEntry(entry: IdentityGenealogyEntry): boolean {
  if (entry.relationship !== 'PAI' && entry.relationship !== 'MAE') {
    return false;
  }
  if (entry.generation == null) return true;
  return entry.generation === 1;
}

export function queryMatchesIdentity(query: string, ...values: (string | null | undefined)[]): boolean {
  const normalizedQuery = normalizeIdentity(query);
  if (!normalizedQuery) return false;
  return values.some((value) => {
    const normalized = normalizeIdentity(value);
    return normalized.includes(normalizedQuery) || normalizedQuery.includes(normalized);
  });
}
