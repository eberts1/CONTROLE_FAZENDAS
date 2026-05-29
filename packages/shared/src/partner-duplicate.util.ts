import { normalizeDocument } from './partner-document.util';

interface PartnerForDuplicate {
  id: string;
  name: string;
  document: string | null;
  linkCount?: number;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).match(/[a-z0-9]{3,}/g) ?? []);
  const tokensB = new Set(normalizeText(b).match(/[a-z0-9]{3,}/g) ?? []);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let common = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) common++;
  }
  return common / Math.max(tokensA.size, tokensB.size);
}

export type DuplicateGroupReason = 'same_document' | 'same_name' | 'similar_name';

export interface PartnerDuplicateGroup {
  groupId: string;
  reason: DuplicateGroupReason;
  confidence: 'high' | 'medium';
  reviewRequired: boolean;
  suggestedKeepId: string;
  partnerIds: string[];
}

export function buildDuplicateGroups(
  partners: PartnerForDuplicate[],
): PartnerDuplicateGroup[] {
  const groups: PartnerDuplicateGroup[] = [];
  const assigned = new Set<string>();

  const byLinkCount = (ids: string[]) =>
    [...ids].sort((a, b) => {
      const la = partners.find((p) => p.id === a)?.linkCount ?? 0;
      const lb = partners.find((p) => p.id === b)?.linkCount ?? 0;
      return lb - la;
    });

  const docMap = new Map<string, string[]>();
  for (const p of partners) {
    const doc = normalizeDocument(p.document);
    if (!doc) continue;
    const list = docMap.get(doc) ?? [];
    list.push(p.id);
    docMap.set(doc, list);
  }

  for (const [doc, ids] of docMap) {
    if (ids.length < 2) continue;
    const sorted = byLinkCount(ids);
    const groupId = `doc:${doc}`;
    groups.push({
      groupId,
      reason: 'same_document',
      confidence: 'high',
      reviewRequired: false,
      suggestedKeepId: sorted[0],
      partnerIds: sorted,
    });
    ids.forEach((id) => assigned.add(id));
  }

  const nameMap = new Map<string, string[]>();
  for (const p of partners) {
    if (assigned.has(p.id)) continue;
    const key = normalizeText(p.name);
    if (!key) continue;
    const list = nameMap.get(key) ?? [];
    list.push(p.id);
    nameMap.set(key, list);
  }

  for (const [name, ids] of nameMap) {
    if (ids.length < 2) continue;
    const sorted = byLinkCount(ids);
    groups.push({
      groupId: `name:${name}`,
      reason: 'same_name',
      confidence: 'high',
      reviewRequired: false,
      suggestedKeepId: sorted[0],
      partnerIds: sorted,
    });
    ids.forEach((id) => assigned.add(id));
  }

  const remaining = partners.filter((p) => !assigned.has(p.id));
  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      const a = remaining[i];
      const b = remaining[j];
      if (assigned.has(a.id) || assigned.has(b.id)) continue;
      const overlap = tokenOverlap(a.name, b.name);
      if (overlap >= 0.85) {
        const ids = byLinkCount([a.id, b.id]);
        const key = normalizeText(`${a.name}|${b.name}`);
        groups.push({
          groupId: `sim:${key}`,
          reason: 'similar_name',
          confidence: 'medium',
          reviewRequired: true,
          suggestedKeepId: ids[0],
          partnerIds: ids,
        });
        assigned.add(a.id);
        assigned.add(b.id);
      }
    }
  }

  return groups;
}
