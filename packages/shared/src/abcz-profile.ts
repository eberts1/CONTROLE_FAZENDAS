export interface AbczGeneticDepDto {
  description: string;
  dep: string;
  accuracy: string | null;
  deca: string | null;
}

export interface AbczGeneticEvaluationDto {
  id: string;
  period: string | null;
  evaluationKind: string | null;
  iabcz: string | null;
  deca: string | null;
  inbreedingF: string | null;
  deps: AbczGeneticDepDto[];
}

export interface AbczGenealogyEntryDto {
  id: string;
  relationship: string;
  registration: string;
  name: string;
  abczAnimalId: string | null;
  generation: number | null;
  slot: number | null;
}

export interface AbczReproductiveRowDto {
  label: string;
  value: string;
}

export interface AbczProfilePreviewDto {
  permissions: string | null;
  header: {
    coat: string | null;
    city: string | null;
    state: string | null;
    situation: string | null;
    owner: string | null;
    farm: string | null;
    breeder: string | null;
  };
  genealogy: Array<Omit<AbczGenealogyEntryDto, 'id'>>;
  geneticEvaluations: Array<Omit<AbczGeneticEvaluationDto, 'id'>>;
  reproductiveMessage: string | null;
  reproductiveData: AbczReproductiveRowDto[] | null;
  efficiencyMessage: string | null;
}

export interface AnimalAbczProfileDto {
  animalId: string;
  registration: string | null;
  permissions: string | null;
  fetchedAt: string;
  sourceUrl: string | null;
  header: {
    coat: string | null;
    city: string | null;
    state: string | null;
    situation: string | null;
    owner: string | null;
    farm: string | null;
    breeder: string | null;
  };
  genealogy: AbczGenealogyEntryDto[];
  geneticEvaluations: AbczGeneticEvaluationDto[];
  reproductiveMessage: string | null;
  reproductiveData: AbczReproductiveRowDto[] | null;
  efficiencyMessage: string | null;
}
