import type { AnimalSex } from './enums';

export type KinshipMatchedVia = 'manual' | 'abcz' | 'both';

export type KinshipRelationshipLevel = 'filho' | 'neto';

export interface AnimalParentSummaryDto {
  id: string;
  tag: string;
  name: string | null;
}

export interface KinshipAnchorDto {
  kind: 'animal' | 'genealogy';
  animalId?: string;
  genealogyKey?: string;
  tag?: string | null;
  name: string | null;
  registration?: string | null;
  sex?: AnimalSex | null;
  abczAnimalId?: string | null;
  hasAbczProfile?: boolean;
}

export interface KinshipSearchAnimalResultDto {
  kind: 'animal';
  animalId: string;
  tag: string;
  name: string | null;
  sex: AnimalSex;
  hasAbczProfile: boolean;
}

export interface KinshipSearchGenealogyResultDto {
  kind: 'genealogy';
  genealogyKey: string;
  registration: string;
  name: string;
  relationship: string;
  abczAnimalId: string | null;
}

export type KinshipSearchResultDto =
  | KinshipSearchAnimalResultDto
  | KinshipSearchGenealogyResultDto;

export interface KinshipSearchResponseDto {
  animals: KinshipSearchAnimalResultDto[];
  genealogyAncestors: KinshipSearchGenealogyResultDto[];
}

export interface KinshipParentNodeDto {
  kind: 'animal' | 'genealogy';
  relationship: 'PAI' | 'MAE';
  animalId?: string;
  tag?: string | null;
  name: string;
  registration?: string | null;
  abczAnimalId?: string | null;
}

export interface KinshipRelationNodeDto {
  animalId: string;
  tag: string;
  name: string | null;
  sex: AnimalSex;
  relationship: KinshipRelationshipLevel;
  matchedVia: KinshipMatchedVia;
  intermediateParent?: AnimalParentSummaryDto;
}

export interface KinshipTreeDto {
  anchor: KinshipAnchorDto;
  parents: KinshipParentNodeDto[];
  children: KinshipRelationNodeDto[];
  grandchildren: KinshipRelationNodeDto[];
}
