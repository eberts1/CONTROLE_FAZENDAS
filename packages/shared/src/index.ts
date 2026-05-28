export * from './enums';
export * from './schemas';
export * from './abcz';
export * from './abcz-profile';
export * from './genealogy-pedigree';
export * from './animal-identity';
export * from './kinship';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: import('./enums').Role;
  createdAt: string;
}

export interface FarmDto {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AreaDto {
  id: string;
  farmId: string;
  name: string;
  type: import('./enums').AreaType;
  hectares: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessDto {
  id: string;
  farmId: string;
  name: string;
  category: import('./enums').ProcessCategory;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessRecordDto {
  id: string;
  processId: string;
  areaId: string;
  performedAt: string;
  notes: string | null;
  createdById: string;
  createdAt: string;
  process?: ProcessDto;
  area?: AreaDto;
}

export interface AnimalDto {
  id: string;
  farmId: string;
  tag: string;
  name: string | null;
  breed: string | null;
  sex: import('./enums').AnimalSex;
  birthDate: string | null;
  status: import('./enums').AnimalStatus;
  notes: string | null;
  abczAnimalId: string | null;
  abczSerie: string | null;
  abczRgn: string | null;
  abczRgd: string | null;
  abczBreedCode: number | null;
  abczCategoryCode: number | null;
  abczSyncedAt: string | null;
  abczSourceUrl: string | null;
  abczOwnerId: string | null;
  hasAbczProfile: boolean;
  sireId: string | null;
  damId: string | null;
  sire?: import('./kinship').AnimalParentSummaryDto;
  dam?: import('./kinship').AnimalParentSummaryDto;
  createdAt: string;
  updatedAt: string;
}

export interface GeneticLotSourceAnimalDto {
  id: string;
  tag: string;
  name: string | null;
}

export interface GeneticLotDto {
  id: string;
  farmId: string;
  sourceAnimalId: string;
  materialType: import('./enums').GeneticMaterialType;
  lotCode: string;
  collectedAt: string | null;
  initialDoses: number;
  storageTank: string | null;
  storageCanister: string | null;
  storagePosition: string | null;
  laboratory: string | null;
  expiresAt: string | null;
  notes: string | null;
  currentDoses: number;
  sourceAnimal?: GeneticLotSourceAnimalDto;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementDto {
  id: string;
  geneticLotId: string;
  type: import('./enums').StockMovementType;
  quantity: number;
  reason: string | null;
  referenceDate: string;
  createdById: string;
  createdAt: string;
}

export interface GeneticStockSummaryDto {
  totalDoses: number;
  semenDoses: number;
  embryoDoses: number;
  lowStockLots: number;
  expiringSoonLots: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserDto;
  farms: FarmDto[];
}
