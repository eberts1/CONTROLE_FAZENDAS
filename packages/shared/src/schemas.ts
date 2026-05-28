import { z } from 'zod';
import {
  AnimalSex,
  AnimalStatus,
  AreaType,
  GeneticMaterialType,
  ProcessCategory,
  StockMovementType,
} from './enums';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const createFarmSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  location: z.string().optional(),
});

export const updateFarmSchema = createFarmSchema.partial();

export const createAreaSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  type: z.nativeEnum(AreaType),
  hectares: z.number().positive().optional(),
  description: z.string().optional(),
});

export const updateAreaSchema = createAreaSchema.partial();

export const createProcessSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  category: z.nativeEnum(ProcessCategory),
  description: z.string().optional(),
});

export const updateProcessSchema = createProcessSchema.partial();

export const createProcessRecordSchema = z.object({
  processId: z.string().uuid(),
  areaId: z.string().uuid(),
  performedAt: z.string().min(1, 'Data obrigatória'),
  notes: z.string().optional(),
});

export const updateProcessRecordSchema = createProcessRecordSchema.partial();

const abczGeneticDepSchema = z.object({
  description: z.string(),
  dep: z.string(),
  accuracy: z.string().nullable(),
  deca: z.string().nullable(),
});

const abczGeneticEvaluationSnapshotSchema = z.object({
  period: z.string().nullable(),
  evaluationKind: z.string().nullable(),
  iabcz: z.string().nullable(),
  deca: z.string().nullable(),
  inbreedingF: z.string().nullable(),
  deps: z.array(abczGeneticDepSchema),
});

const abczGenealogySnapshotSchema = z.object({
  relationship: z.string(),
  registration: z.string(),
  name: z.string(),
  abczAnimalId: z.string().nullable(),
  generation: z.number().nullable(),
  slot: z.number().nullable(),
});

/** Perfil ABCZ já consultado no cadastro — gravado no banco local da aplicação. */
export const abczProfileSnapshotSchema = z.object({
  permissions: z.string().nullable(),
  header: z.object({
    coat: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    situation: z.string().nullable(),
    owner: z.string().nullable(),
    farm: z.string().nullable(),
    breeder: z.string().nullable(),
  }),
  genealogy: z.array(abczGenealogySnapshotSchema),
  geneticEvaluations: z.array(abczGeneticEvaluationSnapshotSchema),
  reproductiveMessage: z.string().nullable(),
  reproductiveData: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .nullable(),
  efficiencyMessage: z.string().nullable(),
});

export const createAnimalSchema = z.object({
  tag: z.string().min(1, 'Identificação obrigatória'),
  name: z.string().optional(),
  breed: z.string().optional(),
  sex: z.nativeEnum(AnimalSex),
  birthDate: z.string().optional(),
  status: z.nativeEnum(AnimalStatus).optional(),
  notes: z.string().optional(),
  abczAnimalId: z.string().optional(),
  abczSerie: z.string().optional(),
  abczRgn: z.string().optional(),
  abczRgd: z.string().optional(),
  abczBreedCode: z.number().int().optional(),
  abczCategoryCode: z.number().int().optional(),
  abczSourceUrl: z.string().optional(),
  abczOwnerId: z.string().optional(),
  abczProfileSnapshot: abczProfileSnapshotSchema.optional(),
  sireId: z.string().uuid().optional().nullable(),
  damId: z.string().uuid().optional().nullable(),
});

export const updateAnimalSchema = createAnimalSchema.partial();

export const createGeneticLotSchema = z.object({
  sourceAnimalId: z.string().uuid('Animal doador inválido'),
  materialType: z.nativeEnum(GeneticMaterialType),
  lotCode: z.string().min(1, 'Código do lote obrigatório'),
  collectedAt: z.string().optional(),
  initialDoses: z.number().int().min(1, 'Mínimo 1 dose'),
  storageTank: z.string().optional(),
  storageCanister: z.string().optional(),
  storagePosition: z.string().optional(),
  laboratory: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});

export const updateGeneticLotSchema = createGeneticLotSchema
  .omit({ initialDoses: true })
  .partial()
  .extend({
    initialDoses: z.number().int().min(1).optional(),
  });

export const createStockMovementSchema = z.object({
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int().min(1, 'Quantidade mínima: 1'),
  reason: z.string().optional(),
  referenceDate: z.string().min(1, 'Data obrigatória'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type CreateProcessInput = z.infer<typeof createProcessSchema>;
export type UpdateProcessInput = z.infer<typeof updateProcessSchema>;
export type CreateProcessRecordInput = z.infer<typeof createProcessRecordSchema>;
export type UpdateProcessRecordInput = z.infer<typeof updateProcessRecordSchema>;
export type AbczProfileSnapshotInput = z.infer<typeof abczProfileSnapshotSchema>;
export type CreateAnimalInput = z.infer<typeof createAnimalSchema>;
export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;
export type CreateGeneticLotInput = z.infer<typeof createGeneticLotSchema>;
export type UpdateGeneticLotInput = z.infer<typeof updateGeneticLotSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
