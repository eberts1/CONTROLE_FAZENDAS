import type { AnimalDto, AnimalAbczProfileDto } from '@controle-fazendas/shared';
import { AnimalSex } from '@controle-fazendas/shared/enums';
import {
  buildIdentityKeys,
  identitiesMatch,
  isImmediateParentEntry,
} from '@controle-fazendas/shared/animal-identity';

export interface SuggestedParents {
  sireId?: string;
  damId?: string;
}

export function suggestParentsFromAbczProfile(
  animals: AnimalDto[],
  profile: AnimalAbczProfileDto,
  excludeAnimalId?: string,
): SuggestedParents {
  const result: SuggestedParents = {};
  const candidates = animals.filter((a) => a.id !== excludeAnimalId);

  for (const entry of profile.genealogy) {
    if (!isImmediateParentEntry(entry)) continue;

    const match = candidates.find((candidate) => {
      const keys = buildIdentityKeys({
        tag: candidate.tag,
        name: candidate.name,
        abczAnimalId: candidate.abczAnimalId,
        abczSerie: candidate.abczSerie,
        abczRgn: candidate.abczRgn,
      });
      return identitiesMatch(keys, entry);
    });

    if (!match) continue;
    if (entry.relationship === 'PAI' && match.sex === AnimalSex.MACHO) {
      result.sireId = match.id;
    }
    if (entry.relationship === 'MAE' && match.sex === AnimalSex.FEMEA) {
      result.damId = match.id;
    }
  }

  return result;
}
