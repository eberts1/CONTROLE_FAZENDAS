import { normalizeDocument } from './partner-document.util';
import type { ParsedBuyerRow } from './bula-buyer-list-parser.util';

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export type PartnerMatchType = 'document' | 'name_exact' | 'email' | 'name_partial';

export type PartnerFillableField =
  | 'name'
  | 'document'
  | 'email'
  | 'phone'
  | 'phone2'
  | 'phone3'
  | 'address'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'ranchName'
  | 'ranchCity'
  | 'ranchState'
  | 'ranchRegistration';

export interface PartnerMatchCandidate {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  phone3?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  ranchName?: string | null;
  ranchCity?: string | null;
  ranchState?: string | null;
  ranchRegistration?: string | null;
}

export interface PartnerFieldFill {
  field: PartnerFillableField;
  currentValue: string | null;
  newValue: string;
}

export interface PartnerMatchResult {
  partnerId: string;
  partnerName: string;
  matchType: PartnerMatchType;
  score: number;
  fieldsToFill: PartnerFieldFill[];
}

const FILLABLE_FIELDS: PartnerFillableField[] = [
  'name',
  'document',
  'email',
  'phone',
  'phone2',
  'phone3',
  'address',
  'city',
  'state',
  'zipCode',
  'ranchName',
  'ranchCity',
  'ranchState',
  'ranchRegistration',
];

function isEmpty(value: string | null | undefined): boolean {
  return !value?.trim();
}

function valuesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (isEmpty(a) && isEmpty(b)) return true;
  if (isEmpty(a) || isEmpty(b)) return false;
  const field = a === b;
  if (field) return true;
  if (a!.includes('@') || b!.includes('@')) {
    return a!.trim().toLowerCase() === b!.trim().toLowerCase();
  }
  const docA = normalizeDocument(a);
  const docB = normalizeDocument(b);
  if (docA && docB) return docA === docB;
  return normalizeText(a!) === normalizeText(b!);
}

export function computeFieldsToFill(
  partner: PartnerMatchCandidate,
  incoming: Partial<Record<PartnerFillableField, string | null | undefined>>,
): PartnerFieldFill[] {
  const fills: PartnerFieldFill[] = [];

  for (const field of FILLABLE_FIELDS) {
    const newValue = incoming[field]?.trim();
    if (!newValue) continue;

    const current = partner[field] ?? null;
    if (isEmpty(current)) {
      fills.push({ field, currentValue: current, newValue });
    }
  }

  return fills;
}

export function isPartnerIdenticalToImport(
  partner: PartnerMatchCandidate,
  incoming: Partial<Record<PartnerFillableField, string | null | undefined>>,
): boolean {
  for (const field of FILLABLE_FIELDS) {
    const incomingVal = incoming[field];
    if (!incomingVal?.trim()) continue;
    const current = partner[field] ?? null;
    if (!isEmpty(current) && !valuesEqual(current, incomingVal)) return false;
  }
  return computeFieldsToFill(partner, incoming).length === 0;
}

export function matchPartner<
  T extends PartnerMatchCandidate,
>(
  incoming: {
    name?: string | null;
    document?: string | null;
    email?: string | null;
  },
  partners: T[],
): (PartnerMatchResult & { partner: T }) | null {
  if (!partners.length) return null;

  const normalizedDoc = normalizeDocument(incoming.document);
  const normalizedName = incoming.name ? normalizeText(incoming.name) : '';
  const normalizedEmail = incoming.email?.trim().toLowerCase() ?? '';

  if (normalizedDoc) {
    const byDoc = partners.find(
      (p) => normalizeDocument(p.document) === normalizedDoc,
    );
    if (byDoc) {
      return buildMatch(byDoc, incoming, 'document', 100);
    }
  }

  if (normalizedName) {
    const exact = partners.find((p) => normalizeText(p.name) === normalizedName);
    if (exact) {
      return buildMatch(exact, incoming, 'name_exact', 90);
    }
  }

  if (normalizedEmail) {
    const byEmail = partners.find(
      (p) => p.email?.trim().toLowerCase() === normalizedEmail,
    );
    if (byEmail) {
      return buildMatch(byEmail, incoming, 'email', 85);
    }
  }

  if (normalizedName) {
    const partial = partners.find((p) => {
      const partnerName = normalizeText(p.name);
      return partnerName.includes(normalizedName) || normalizedName.includes(partnerName);
    });
    if (partial) {
      return buildMatch(partial, incoming, 'name_partial', 70);
    }
  }

  return null;
}

function buildMatch<T extends PartnerMatchCandidate>(
  partner: T,
  incoming: Partial<Record<PartnerFillableField, string | null | undefined>>,
  matchType: PartnerMatchType,
  score: number,
): PartnerMatchResult & { partner: T } {
  const fieldsToFill = computeFieldsToFill(partner, incoming);
  return {
    partnerId: partner.id,
    partnerName: partner.name,
    matchType,
    score,
    fieldsToFill,
    partner,
  };
}

export type PartnerImportAction = 'create' | 'skip' | 'update';

export function resolveImportAction(
  match: PartnerMatchResult | null,
  partner: PartnerMatchCandidate | null,
  incoming: Partial<Record<PartnerFillableField, string | null | undefined>>,
): PartnerImportAction {
  if (!match || !partner) return 'create';
  if (isPartnerIdenticalToImport(partner, incoming)) return 'skip';
  if (match.fieldsToFill.length > 0) return 'update';
  return 'skip';
}

export function parsedBuyerToPartnerFields(row: ParsedBuyerRow): Record<PartnerFillableField, string | null> {
  return {
    name: row.name,
    document: row.document,
    email: row.email,
    phone: row.phone,
    phone2: row.phone2,
    phone3: row.phone3,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    ranchName: row.ranchName,
    ranchCity: row.ranchCity,
    ranchState: row.ranchState,
    ranchRegistration: row.ranchRegistration,
  };
}
