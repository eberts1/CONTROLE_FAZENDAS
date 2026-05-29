import { AnimalDto, parseAbczRegistration } from '@controle-fazendas/shared';

export interface AnimalAbczQuery {
  serie: string;
  rgn: string;
  source: 'abcz_fields' | 'tag';
}

/** Resolve série e RGN para consulta ABCZ a partir do cadastro ou do brinco. */
export function resolveAnimalAbczQuery(animal: AnimalDto): AnimalAbczQuery | null {
  if (animal.abczSerie?.trim() && animal.abczRgn?.trim()) {
    return {
      serie: animal.abczSerie.trim().toUpperCase(),
      rgn: animal.abczRgn.trim(),
      source: 'abcz_fields',
    };
  }
  const parsed = parseAbczRegistration(animal.tag);
  if (parsed) {
    return { serie: parsed.serie, rgn: parsed.rgn, source: 'tag' };
  }
  return null;
}

export function canQueryAnimalOnAbcz(animal: AnimalDto): boolean {
  return resolveAnimalAbczQuery(animal) !== null;
}
