import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  type KinshipAnchorDto,
  type KinshipMatchedVia,
  type KinshipParentNodeDto,
  type KinshipRelationNodeDto,
  type KinshipSearchGenealogyResultDto,
  type KinshipSearchResponseDto,
  type KinshipTreeDto,
  AnimalSex as SharedAnimalSex,
  buildGenealogyKey,
  buildIdentityKeys,
  identitiesMatch,
  isImmediateParentEntry,
  queryMatchesIdentity,
  type IdentityKeys,
  type IdentityGenealogyEntry,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';

const farmAnimalInclude = {
  abczSnapshot: { include: { genealogy: { orderBy: { sortOrder: 'asc' as const } } } },
  sire: { select: { id: true, tag: true, name: true } },
  dam: { select: { id: true, tag: true, name: true } },
} satisfies Prisma.AnimalInclude;

type FarmAnimal = Prisma.AnimalGetPayload<{ include: typeof farmAnimalInclude }>;

@Injectable()
export class KinshipService {
  constructor(private prisma: PrismaService) {}

  private async loadFarmAnimals(farmId: string): Promise<FarmAnimal[]> {
    return this.prisma.animal.findMany({
      where: { farmId },
      orderBy: { tag: 'asc' },
      include: farmAnimalInclude,
    });
  }

  private genealogyEntries(animal: FarmAnimal): IdentityGenealogyEntry[] {
    return (animal.abczSnapshot?.genealogy ?? []).map((entry) => ({
      relationship: entry.relationship,
      registration: entry.registration,
      name: entry.name,
      abczAnimalId: entry.abczAnimalId,
      generation: entry.generation,
      slot: entry.slot,
    }));
  }

  private animalIdentityInput(animal: FarmAnimal) {
    return {
      tag: animal.tag,
      name: animal.name,
      abczAnimalId: animal.abczAnimalId,
      abczSerie: animal.abczSerie,
      abczRgn: animal.abczRgn,
      genealogy: this.genealogyEntries(animal),
    };
  }

  private anchorKeysFromAnimal(animal: FarmAnimal): IdentityKeys {
    return buildIdentityKeys(this.animalIdentityInput(animal));
  }

  private anchorKeysFromGenealogy(entry: {
    registration: string;
    name: string;
    abczAnimalId?: string | null;
  }): IdentityKeys {
    return buildIdentityKeys({
      tag: entry.registration || entry.name,
      name: entry.name,
      abczAnimalId: entry.abczAnimalId,
      genealogy: [],
    });
  }

  private findAnimalByGenealogyKey(animals: FarmAnimal[], genealogyKey: string): FarmAnimal | null {
    for (const animal of animals) {
      if (buildGenealogyKey({ registration: animal.tag, name: animal.name ?? animal.tag, abczAnimalId: animal.abczAnimalId }) === genealogyKey) {
        return animal;
      }
      for (const entry of this.genealogyEntries(animal)) {
        if (entry.relationship === 'ANIMAL' && buildGenealogyKey(entry) === genealogyKey) {
          return animal;
        }
      }
    }
    return null;
  }

  private resolveGenealogyAnchor(
    animals: FarmAnimal[],
    genealogyKey: string,
  ): { anchor: KinshipAnchorDto; keys: IdentityKeys; animalId?: string } {
    const seen = new Map<string, IdentityGenealogyEntry & { registration: string; name: string }>();

    for (const animal of animals) {
      for (const entry of this.genealogyEntries(animal)) {
        if (entry.relationship !== 'PAI' && entry.relationship !== 'MAE') continue;
        const key = buildGenealogyKey(entry);
        if (!seen.has(key)) {
          seen.set(key, entry as IdentityGenealogyEntry & { registration: string; name: string });
        }
      }
    }

    const matched = seen.get(genealogyKey);
    if (!matched) {
      throw new NotFoundException('Ancestral não encontrado na genealogia da fazenda');
    }

    const linkedAnimal = this.findAnimalByGenealogyKey(animals, genealogyKey);
    const keys = linkedAnimal
      ? this.anchorKeysFromAnimal(linkedAnimal)
      : this.anchorKeysFromGenealogy(matched);

    return {
      animalId: linkedAnimal?.id,
      keys,
      anchor: {
        kind: linkedAnimal ? 'animal' : 'genealogy',
        animalId: linkedAnimal?.id,
        genealogyKey,
        tag: linkedAnimal?.tag ?? null,
        name: matched.name,
        registration: matched.registration,
        sex:
          matched.relationship === 'PAI'
            ? SharedAnimalSex.MACHO
            : matched.relationship === 'MAE'
              ? SharedAnimalSex.FEMEA
              : null,
        abczAnimalId: matched.abczAnimalId,
        hasAbczProfile: linkedAnimal ? Boolean(linkedAnimal.abczSnapshot) : false,
      },
    };
  }

  async search(farmId: string, query: string): Promise<KinshipSearchResponseDto> {
    const q = query.trim();
    if (!q) {
      return { animals: [], genealogyAncestors: [] };
    }

    const animals = await this.loadFarmAnimals(farmId);
    const matchedAnimals = animals
      .filter((animal) => queryMatchesIdentity(q, animal.tag, animal.name))
      .map((animal) => ({
        kind: 'animal' as const,
        animalId: animal.id,
        tag: animal.tag,
        name: animal.name,
        sex: animal.sex as SharedAnimalSex,
        hasAbczProfile: Boolean(animal.abczSnapshot),
      }));

    const genealogyMap = new Map<string, KinshipSearchGenealogyResultDto>();

    for (const animal of animals) {
      for (const entry of this.genealogyEntries(animal)) {
        if (entry.relationship !== 'PAI' && entry.relationship !== 'MAE') continue;
        if (!queryMatchesIdentity(q, entry.registration, entry.name)) continue;

        const genealogyKey = buildGenealogyKey(entry);
        if (!genealogyMap.has(genealogyKey)) {
          genealogyMap.set(genealogyKey, {
            kind: 'genealogy',
            genealogyKey,
            registration: entry.registration,
            name: entry.name,
            relationship: entry.relationship,
            abczAnimalId: entry.abczAnimalId ?? null,
          });
        }
      }
    }

    return {
      animals: matchedAnimals,
      genealogyAncestors: Array.from(genealogyMap.values()),
    };
  }

  private findDescendantsByAbcz(
    animals: FarmAnimal[],
    anchorKeys: IdentityKeys,
    excludeAnimalId?: string,
  ): Set<string> {
    const matched = new Set<string>();
    for (const animal of animals) {
      if (excludeAnimalId && animal.id === excludeAnimalId) continue;
      for (const entry of this.genealogyEntries(animal)) {
        if (!isImmediateParentEntry(entry)) continue;
        if (identitiesMatch(anchorKeys, entry)) {
          matched.add(animal.id);
          break;
        }
      }
    }
    return matched;
  }

  private findManualChildren(animals: FarmAnimal[], anchorAnimalId: string): Set<string> {
    const matched = new Set<string>();
    for (const animal of animals) {
      if (animal.sireId === anchorAnimalId || animal.damId === anchorAnimalId) {
        matched.add(animal.id);
      }
    }
    return matched;
  }

  private mergeChildMatches(
    manualIds: Set<string>,
    abczIds: Set<string>,
  ): Map<string, KinshipMatchedVia> {
    const result = new Map<string, KinshipMatchedVia>();
    for (const id of manualIds) result.set(id, 'manual');
    for (const id of abczIds) {
      const existing = result.get(id);
      result.set(id, existing ? 'both' : 'abcz');
    }
    return result;
  }

  private toRelationNode(
    animal: FarmAnimal,
    relationship: 'filho' | 'neto',
    matchedVia: KinshipMatchedVia,
    intermediateParent?: { id: string; tag: string; name: string | null },
  ): KinshipRelationNodeDto {
    return {
      animalId: animal.id,
      tag: animal.tag,
      name: animal.name,
      sex: animal.sex as SharedAnimalSex,
      relationship,
      matchedVia,
      intermediateParent: intermediateParent
        ? { id: intermediateParent.id, tag: intermediateParent.tag, name: intermediateParent.name }
        : undefined,
    };
  }

  private buildParents(animals: FarmAnimal[], anchorAnimal: FarmAnimal | null): KinshipParentNodeDto[] {
    const parents: KinshipParentNodeDto[] = [];

    if (anchorAnimal?.sire) {
      parents.push({
        kind: 'animal',
        relationship: 'PAI',
        animalId: anchorAnimal.sire.id,
        tag: anchorAnimal.sire.tag,
        name: anchorAnimal.sire.name ?? anchorAnimal.sire.tag,
      });
    }
    if (anchorAnimal?.dam) {
      parents.push({
        kind: 'animal',
        relationship: 'MAE',
        animalId: anchorAnimal.dam.id,
        tag: anchorAnimal.dam.tag,
        name: anchorAnimal.dam.name ?? anchorAnimal.dam.tag,
      });
    }

    if (anchorAnimal) {
      for (const entry of this.genealogyEntries(anchorAnimal)) {
        if (!isImmediateParentEntry(entry)) continue;
        const rel = entry.relationship === 'MAE' ? 'MAE' : 'PAI';
        const localMatch = animals.find((candidate) =>
          identitiesMatch(buildIdentityKeys(this.animalIdentityInput(candidate)), entry),
        );

        const already = parents.some(
          (p) => p.relationship === rel && (p.animalId === localMatch?.id || p.registration === entry.registration),
        );
        if (already) continue;

        if (localMatch) {
          parents.push({
            kind: 'animal',
            relationship: rel,
            animalId: localMatch.id,
            tag: localMatch.tag,
            name: localMatch.name ?? entry.name,
            registration: entry.registration,
            abczAnimalId: entry.abczAnimalId ?? undefined,
          });
        } else {
          parents.push({
            kind: 'genealogy',
            relationship: rel,
            name: entry.name,
            registration: entry.registration,
            abczAnimalId: entry.abczAnimalId ?? undefined,
          });
        }
      }
    }

    return parents;
  }

  async getTree(
    farmId: string,
    params: { animalId?: string; genealogyKey?: string; depth?: number },
  ): Promise<KinshipTreeDto> {
    if (!params.animalId && !params.genealogyKey) {
      throw new BadRequestException('Informe animalId ou genealogyKey');
    }
    if (params.animalId && params.genealogyKey) {
      throw new BadRequestException('Informe apenas animalId ou genealogyKey');
    }

    const depth = params.depth ?? 2;
    const animals = await this.loadFarmAnimals(farmId);
    const byId = new Map(animals.map((a) => [a.id, a]));

    let anchor: KinshipAnchorDto;
    let anchorKeys: IdentityKeys;
    let anchorAnimalId: string | undefined;

    if (params.animalId) {
      const animal = byId.get(params.animalId);
      if (!animal) throw new NotFoundException('Animal não encontrado');
      anchorAnimalId = animal.id;
      anchorKeys = this.anchorKeysFromAnimal(animal);
      anchor = {
        kind: 'animal',
        animalId: animal.id,
        tag: animal.tag,
        name: animal.name,
        sex: animal.sex as SharedAnimalSex,
        abczAnimalId: animal.abczAnimalId,
        hasAbczProfile: Boolean(animal.abczSnapshot),
      };
    } else {
      const resolved = this.resolveGenealogyAnchor(animals, params.genealogyKey!);
      anchor = resolved.anchor;
      anchorKeys = resolved.keys;
      anchorAnimalId = resolved.animalId;
    }

    const manualChildIds = anchorAnimalId
      ? this.findManualChildren(animals, anchorAnimalId)
      : new Set<string>();
    const abczChildIds = this.findDescendantsByAbcz(animals, anchorKeys, anchorAnimalId);
    const childMatches = this.mergeChildMatches(manualChildIds, abczChildIds);

    const children: KinshipRelationNodeDto[] = [];
    for (const [id, matchedVia] of childMatches) {
      const animal = byId.get(id);
      if (animal) children.push(this.toRelationNode(animal, 'filho', matchedVia));
    }
    children.sort((a, b) => a.tag.localeCompare(b.tag));

    const grandchildren: KinshipRelationNodeDto[] = [];
    if (depth >= 2) {
      const grandchildMap = new Map<string, KinshipRelationNodeDto>();

      for (const child of children) {
        const childAnimal = byId.get(child.animalId)!;
        const childKeys = this.anchorKeysFromAnimal(childAnimal);
        const childManual = this.findManualChildren(animals, child.animalId);
        const childAbcz = this.findDescendantsByAbcz(animals, childKeys, child.animalId);
        const grandMatches = this.mergeChildMatches(childManual, childAbcz);

        for (const [grandId, matchedVia] of grandMatches) {
          if (grandId === anchorAnimalId) continue;
          const existing = grandchildMap.get(grandId);
          const grandAnimal = byId.get(grandId)!;
          const node = this.toRelationNode(grandAnimal, 'neto', matchedVia, {
            id: child.animalId,
            tag: child.tag,
            name: child.name,
          });
          if (!existing) {
            grandchildMap.set(grandId, node);
          } else if (existing.matchedVia !== matchedVia && matchedVia === 'both') {
            grandchildMap.set(grandId, { ...node, matchedVia: 'both' });
          }
        }
      }

      grandchildren.push(...Array.from(grandchildMap.values()));
      grandchildren.sort((a, b) => a.tag.localeCompare(b.tag));
    }

    const anchorAnimal = anchorAnimalId ? byId.get(anchorAnimalId) ?? null : null;

    return {
      anchor,
      parents: this.buildParents(animals, anchorAnimal),
      children,
      grandchildren,
    };
  }
}
