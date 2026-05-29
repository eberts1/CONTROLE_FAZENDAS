import { AnimalSex } from './enums';
import { ParsedInstallmentRow, parseSaleMapText } from './sale-map-parser.util';
import { roundMoney } from './finance-allocation.util';
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function parseAbczRegistration(
  raw: string | null | undefined,
): { serie: string; rgn: string } | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().replace(/\s+/g, ' ');
  const abczMatch = normalized.match(/^(GSCA?)\s*[-]?\s*(\d+)$/i);
  if (abczMatch) {
    return { serie: abczMatch[1].toUpperCase(), rgn: abczMatch[2] };
  }
  const lcfMatch = normalized.match(/^(LCF)\s*[-]?\s*(\d+)$/i);
  if (lcfMatch) {
    return { serie: lcfMatch[1].toUpperCase(), rgn: lcfMatch[2] };
  }
  return null;
}

function isPartialIdentityMatch(field: string, term: string): boolean {
  if (field === term) return true;
  if (term.length < 4) return false;
  if (term === 'gsc' && field.startsWith('gsca')) return false;
  if (term === 'gsca' && field.startsWith('gsc') && !field.startsWith('gsca')) return false;
  return field.includes(term) || (term.includes(field) && field.length >= 4);
}

export function registrationSearchTerms(
  registration: string | null | undefined,
  description?: string | null,
): string[] {
  const terms = new Set<string>();

  if (registration?.trim()) {
    const trimmed = registration.trim();
    const parsed = parseAbczRegistration(trimmed);
    if (parsed) {
      terms.add(`${parsed.serie} ${parsed.rgn}`);
      terms.add(`${parsed.serie}${parsed.rgn}`);
      terms.add(parsed.rgn);
      terms.add(normalizeText(`${parsed.serie} ${parsed.rgn}`));
    } else if (/\d/.test(trimmed)) {
      const parts = trimmed.split(/\s+/);
      terms.add(trimmed);
      terms.add(parts.join(''));
      terms.add(parts[parts.length - 1] ?? trimmed);
      terms.add(normalizeText(trimmed));
    }
  }

  if (description?.trim()) {
    const gscMatch = description.match(/\b(GSCA?\s*\d+)\b/i);
    if (gscMatch) {
      terms.add(gscMatch[1].trim());
      terms.add(gscMatch[1].replace(/\s+/g, ''));
      terms.add(normalizeText(gscMatch[1]));
    }

    const lcfMatch = description.match(/\b(LCF\s*\d+)\b/i);
    if (lcfMatch) {
      terms.add(lcfMatch[1].trim());
      terms.add(lcfMatch[1].replace(/\s+/g, ''));
      terms.add(normalizeText(lcfMatch[1]));
      terms.add(lcfMatch[1].match(/\d+/)?.[0] ?? '');
    }

    const parenMatch = description.match(/\((\d+)\s+[^)]+\)/);
    if (parenMatch) {
      terms.add(parenMatch[1]);
      terms.add(`GSC ${parenMatch[1]}`);
      terms.add(`GSCA ${parenMatch[1]}`);
      terms.add(`GSC${parenMatch[1]}`);
      terms.add(`GSCA${parenMatch[1]}`);
    }
  }

  return [...terms].filter(Boolean);
}

export interface AnimalMatchCandidate {
  id: string;
  tag: string;
  name: string | null;
  score: number;
}

export function scoreAnimalMatch<
  T extends {
    id: string;
    tag: string;
    name: string | null;
    abczSerie?: string | null;
    abczRgn?: string | null;
  },
>(animal: T, terms: string[]): number {
  const normalizedTerms = terms.map(normalizeText).filter(Boolean);
  if (normalizedTerms.length === 0) return 0;

  const fields = [
    animal.tag,
    animal.name ?? '',
    animal.abczSerie ?? '',
    animal.abczRgn ?? '',
    `${animal.abczSerie ?? ''} ${animal.abczRgn ?? ''}`,
  ]
    .map(normalizeText)
    .filter(Boolean);

  const rgn = normalizeText(animal.abczRgn ?? '');

  let best = 0;
  for (const term of normalizedTerms) {
    if (/^\d+$/.test(term) && rgn === term) {
      best = Math.max(best, 100);
      continue;
    }

    for (const field of fields) {
      if (field === term) {
        best = Math.max(best, 100);
      } else if (isPartialIdentityMatch(field, term)) {
        best = Math.max(best, 80);
      }
    }
  }
  return best;
}

export function matchAnimalByRegistration<
  T extends {
    id: string;
    tag: string;
    name: string | null;
    abczSerie?: string | null;
    abczRgn?: string | null;
  },
>(
  registration: string | null | undefined,
  animals: T[],
  description?: string | null,
): T | null {
  const ranked = rankAnimalMatches(registration, animals, description);
  const terms = registrationSearchTerms(registration, description);
  const hasNumericTerm = terms.some((term) => /\d/.test(term));
  const threshold = hasNumericTerm ? 80 : 50;
  return ranked[0]?.score >= threshold ? (animals.find((a) => a.id === ranked[0].id) ?? null) : null;
}

export function rankAnimalMatches<
  T extends {
    id: string;
    tag: string;
    name: string | null;
    abczSerie?: string | null;
    abczRgn?: string | null;
  },
>(
  registration: string | null | undefined,
  animals: T[],
  description?: string | null,
): AnimalMatchCandidate[] {
  const terms = registrationSearchTerms(registration, description);
  return animals
    .map((animal) => ({
      id: animal.id,
      tag: animal.tag,
      name: animal.name,
      score: scoreAnimalMatch(animal, terms),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function matchPartnerByName<
  T extends { id: string; name: string },
>(buyerName: string | null | undefined, partners: T[]): T | null {
  if (!buyerName?.trim()) return null;
  const normalized = normalizeText(buyerName);

  const exact = partners.find((partner) => normalizeText(partner.name) === normalized);
  if (exact) return exact;

  return (
    partners.find((partner) => {
      const partnerName = normalizeText(partner.name);
      return partnerName.includes(normalized) || normalized.includes(partnerName);
    }) ?? null
  );
}

export function buildDefaultInstallmentPaidFlags(
  installments: Array<{ dueDate: string }>,
  referenceDate = new Date(),
): boolean[] {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return installments.map((row) => {
    const due = new Date(row.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
}

function installmentLabel(sequence: number): string {
  return sequence === 0 ? 'Entrada' : `${sequence + 1}ª`;
}

/** Inclui a entrada do PDF quando o cronograma só traz as parcelas futuras. */
export function normalizeSaleMapInstallments(params: {
  netAmount: number | null;
  entryAmount: number | null;
  installments: ParsedInstallmentRow[];
  fallbackDueDate?: string;
}): ParsedInstallmentRow[] {
  const { netAmount, entryAmount, installments, fallbackDueDate } = params;
  const cleaned = installments.filter((row) => row.amount > 0);
  if (cleaned.length === 0 || netAmount == null) {
    return cleaned;
  }

  const sum = roundMoney(cleaned.reduce((total, row) => total + row.amount, 0));
  if (Math.abs(sum - netAmount) <= 0.05) {
    return cleaned;
  }

  if (
    entryAmount != null &&
    entryAmount > 0 &&
    Math.abs(sum + entryAmount - netAmount) <= 1
  ) {
    const dueDate = fallbackDueDate ?? cleaned[0]?.dueDate ?? new Date().toISOString();
    return [
      {
        sequence: 0,
        label: 'Entrada',
        amount: roundMoney(entryAmount),
        dueDate,
      },
      ...cleaned.map((row, index) => ({
        ...row,
        sequence: index + 1,
        label: installmentLabel(index + 1),
      })),
    ];
  }

  return cleaned;
}

export function parsePdfTextContent(rawText: string) {
  return parseSaleMapText(rawText);
}

export interface SaleLotAnimalDraft {
  tag: string;
  name?: string;
  abczSerie?: string;
  abczRgn?: string;
  sex: AnimalSex;
  notes: string;
}

function inferSexFromDescription(description: string | null | undefined): AnimalSex {
  if (!description) return AnimalSex.MACHO;
  const lower = description.toLowerCase();
  if (/\b(novilha|f[eê]mea|vaca|matriz|bezerra)\b/.test(lower)) return AnimalSex.FEMEA;
  if (/\b(touro|macho|bezerro)\b/.test(lower)) return AnimalSex.MACHO;
  return AnimalSex.MACHO;
}

export function buildAnimalDraftFromSaleLot(lot: {
  canal: number;
  registration?: string | null;
  description?: string | null;
}): SaleLotAnimalDraft {
  const registration = lot.registration?.trim();
  const description = lot.description?.trim();

  let abczSerie: string | undefined;
  let abczRgn: string | undefined;
  let tag = registration ?? `LOTE-${String(lot.canal).padStart(2, '0')}`;

  const parsed = parseAbczRegistration(registration);
  if (parsed) {
    abczSerie = parsed.serie;
    abczRgn = parsed.rgn;
    tag = `${parsed.serie} ${parsed.rgn}`;
  } else if (description) {
    const gscMatch = description.match(/\b(GSCA?)\s*(\d+)\b/i);
    if (gscMatch) {
      abczSerie = gscMatch[1].toUpperCase();
      abczRgn = gscMatch[2];
      tag = `${abczSerie} ${abczRgn}`;
    } else {
      const lcfMatch = description.match(/\b(LCF)\s*(\d+)\b/i);
      if (lcfMatch) {
        abczSerie = lcfMatch[1].toUpperCase();
        abczRgn = lcfMatch[2];
        tag = `${abczSerie} ${abczRgn}`;
      } else {
        const parenMatch = description.match(/\((\d+)\s+[^)]+\)/);
        if (parenMatch) {
          abczSerie = 'GSC';
          abczRgn = parenMatch[1];
          tag = `GSC ${abczRgn}`;
        }
      }
    }
  }

  let name: string | undefined;
  if (description) {
    const nameMatch = description.match(/\b(?:GSCA?|LCF)\s*\d+\s*[-–]\s*(.+)/i);
    if (nameMatch) {
      name = nameMatch[1].split(/\s*-\s*/)[0]?.trim();
    } else {
      const animalNameMatch = description.match(
        /\b(?:MACHO|FEMEA|F[EÊ]MEA|NOVILHA|TOURO|GARROTE|NOVILHO)\b[^-]*-\s*([^-]+?)\s*-\s*\d+m/i,
      );
      if (animalNameMatch) {
        name = animalNameMatch[1].trim();
      } else {
        const parts = description.split(/\s*[-–]\s*/);
        if (parts.length > 1) {
          name = parts[parts.length - 1].trim();
        }
      }
    }
  }

  const notes = `Importado do mapa de venda — lote ${lot.canal}${
    registration ? ` (${registration})` : ''
  }`;

  return {
    tag,
    name,
    abczSerie,
    abczRgn,
    sex: inferSexFromDescription(description),
    notes,
  };
}
