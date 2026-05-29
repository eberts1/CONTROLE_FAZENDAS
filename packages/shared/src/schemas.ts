import { z } from 'zod';
import {
  AnimalExpenseType,
  AnimalSaleType,
  AnimalSex,
  AnimalStatus,
  AreaType,
  FarmEventStatus,
  FarmEventType,
  FinanceSection,
  GeneticMaterialType,
  LedgerCategory,
  LedgerEntryType,
  LedgerScope,
  PaymentCondition,
  ProcessCategory,
  RecurrenceFrequency,
  SaleAssetScope,
  StockMovementType,
} from './enums';
import { ownershipRequiresEvent, resolveAssetScope } from './ownership-transfer.util';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme a senha'),
    farmName: z.string().min(2, 'Nome da fazenda deve ter no mínimo 2 caracteres'),
    farmLocation: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
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
  pelagem: z.string().optional(),
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

export const createPartnerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  document: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePartnerSchema = createPartnerSchema.partial();

export const ownershipShareSchema = z.object({
  partnerId: z.string().uuid(),
  ownershipPercent: z
    .number()
    .min(0.01, 'Percentual mínimo: 0,01%')
    .max(100, 'Percentual máximo: 100%'),
  isPrimary: z.boolean().optional(),
});

export const replaceAnimalOwnershipSchema = z.object({
  shares: z.array(ownershipShareSchema).min(1, 'Informe ao menos um proprietário'),
});

export const saleAllocationOverrideSchema = z.object({
  partnerId: z.string().uuid(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountPercent2: z.number().min(0).max(100).optional(),
  entryAmount: z.number().min(0).optional(),
});

export const createFarmEventSchema = z.object({
  type: z.nativeEnum(FarmEventType),
  status: z.nativeEnum(FarmEventStatus).optional(),
  name: z.string().min(2, 'Nome obrigatório'),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organizer: z.string().optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const updateFarmEventSchema = createFarmEventSchema.partial();

export const createAnimalSaleSchema = z
  .object({
    type: z.nativeEnum(AnimalSaleType),
    assetScope: z.nativeEnum(SaleAssetScope).optional(),
    eventId: z.string().uuid().optional(),
    quotaPercent: z.number().min(0.01).max(100).optional(),
    applyOwnershipTransfer: z.boolean().optional(),
    buyerPartnerId: z.string().uuid().optional(),
    sellerPartnerIds: z.array(z.string().uuid()).optional(),
    description: z.string().min(1, 'Descrição obrigatória'),
    totalAmount: z.number().positive('Valor deve ser positivo'),
    transactionDate: z.string().min(1, 'Data obrigatória'),
    commissionPercent: z.number().min(0).max(100).optional(),
    paymentCondition: z.nativeEnum(PaymentCondition).optional(),
    unitValue: z.number().positive().optional(),
    quantity: z.number().int().positive().optional(),
    captures: z.number().int().positive().optional(),
    notes: z.string().optional(),
    allocationOverrides: z.array(saleAllocationOverrideSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const scope = resolveAssetScope(data.type, data.quotaPercent, data.assetScope);
    if (ownershipRequiresEvent(scope) && !data.eventId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Venda de cota ou animal inteiro exige um evento vinculado',
        path: ['eventId'],
      });
    }
    const needsTransfer =
      data.applyOwnershipTransfer ??
      (scope === SaleAssetScope.COTA_ANIMAL || scope === SaleAssetScope.ANIMAL_INTEIRO);
    if (needsTransfer && !data.buyerPartnerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o comprador para transferência de cotas',
        path: ['buyerPartnerId'],
      });
    }
    if (scope === SaleAssetScope.COTA_ANIMAL && data.quotaPercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o percentual da cota vendida',
        path: ['quotaPercent'],
      });
    }
  });

export const updateAnimalSaleSchema = z.object({
  type: z.nativeEnum(AnimalSaleType).optional(),
  assetScope: z.nativeEnum(SaleAssetScope).optional(),
  eventId: z.string().uuid().optional(),
  quotaPercent: z.number().min(0.01).max(100).optional(),
  applyOwnershipTransfer: z.boolean().optional(),
  buyerPartnerId: z.string().uuid().optional(),
  sellerPartnerIds: z.array(z.string().uuid()).optional(),
  description: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  transactionDate: z.string().min(1).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  paymentCondition: z.nativeEnum(PaymentCondition).optional(),
  unitValue: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  captures: z.number().int().positive().optional(),
  notes: z.string().optional(),
  allocationOverrides: z.array(saleAllocationOverrideSchema).optional(),
});

export const createAnimalExpenseSchema = z.object({
  type: z.nativeEnum(AnimalExpenseType),
  eventId: z.string().uuid().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  totalAmount: z.number().positive('Valor deve ser positivo'),
  expenseDate: z.string().min(1, 'Data obrigatória'),
  splitAmongPartners: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateAnimalExpenseSchema = createAnimalExpenseSchema.partial();

export const createLedgerEntrySchema = z.object({
  section: z.nativeEnum(FinanceSection),
  type: z.nativeEnum(LedgerEntryType),
  category: z.nativeEnum(LedgerCategory),
  scope: z.nativeEnum(LedgerScope).optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  entryDate: z.string().min(1, 'Data obrigatória'),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  eventId: z.string().uuid().optional(),
  animalId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  partnerId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateLedgerEntrySchema = createLedgerEntrySchema.partial();

export const createRecurringTemplateSchema = z.object({
  section: z.nativeEnum(FinanceSection).optional(),
  type: z.nativeEnum(LedgerEntryType),
  category: z.nativeEnum(LedgerCategory),
  description: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.nativeEnum(RecurrenceFrequency).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateRecurringTemplateSchema = createRecurringTemplateSchema
  .partial()
  .extend({ active: z.boolean().optional() });

export const generateRecurringSchema = z.object({
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM'),
});

export const createEmployeeSchema = z.object({
  name: z.string().min(2),
  document: z.string().optional(),
  role: z.string().optional(),
  baseSalary: z.number().positive().optional(),
  admissionDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createPayrollRunSchema = z.object({
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  description: z.string().optional(),
});

export const createPayrollLineSchema = z.object({
  employeeId: z.string().uuid(),
  description: z.string().optional(),
  grossAmount: z.number().positive(),
  deductions: z.number().min(0).optional(),
});

export const createInstallmentRowSchema = z.object({
  sequence: z.number().int().min(0),
  label: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().min(1),
  markAsPaid: z.boolean().optional(),
  paidAt: z.string().optional(),
});

export const createSaleInstallmentPlanSchema = z.object({
  saleId: z.string().uuid(),
  buyerPartnerId: z.string().uuid(),
  allocationId: z.string().uuid().optional(),
  auctionLotNumber: z.number().int().positive().optional(),
  netAmount: z.number().positive(),
  bidValue: z.number().positive().optional(),
  notes: z.string().optional(),
  installments: z.array(createInstallmentRowSchema).min(1),
});

export const payInstallmentSchema = z.object({
  paidAt: z.string().min(1),
  paidAmount: z.number().positive().optional(),
  paymentNotes: z.string().optional(),
});

export const saleMapImportInstallmentSchema = z.object({
  sequence: z.number().int().min(0),
  label: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().min(1),
  markAsPaid: z.boolean().optional(),
  paidAt: z.string().optional().nullable(),
});

export const saleMapImportLotSchema = z.object({
  tempId: z.string().min(1),
  selected: z.boolean(),
  canal: z.number().int().positive(),
  description: z.string().optional().nullable(),
  registration: z.string().optional().nullable(),
  animalId: z.string().uuid().optional().nullable(),
  createAnimal: z.boolean().optional(),
  buyerName: z.string().optional().nullable(),
  buyerPartnerId: z.string().uuid().optional().nullable(),
  createBuyer: z.boolean().optional(),
  bidValue: z.number().positive().optional().nullable(),
  captures: z.number().int().positive().optional(),
  quantity: z.number().int().positive().optional(),
  totalAmount: z.number().positive().optional().nullable(),
  netAmount: z.number().positive().optional().nullable(),
  discountAmount: z.number().min(0).optional().nullable(),
  entryAmount: z.number().positive().optional().nullable(),
  isCashPayment: z.boolean().optional(),
  installments: z.array(saleMapImportInstallmentSchema).optional(),
});

export const importSaleMapSchema = z.object({
  transactionDate: z.string().optional(),
  pdfPassword: z.string().optional(),
  lots: z.array(saleMapImportLotSchema).min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
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
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type OwnershipShareInput = z.infer<typeof ownershipShareSchema>;
export type ReplaceAnimalOwnershipInput = z.infer<typeof replaceAnimalOwnershipSchema>;
export type SaleAllocationOverrideInput = z.infer<typeof saleAllocationOverrideSchema>;
export type CreateFarmEventInput = z.infer<typeof createFarmEventSchema>;
export type UpdateFarmEventInput = z.infer<typeof updateFarmEventSchema>;
export type CreateAnimalSaleInput = z.infer<typeof createAnimalSaleSchema>;
export type UpdateAnimalSaleInput = z.infer<typeof updateAnimalSaleSchema>;
export type CreateAnimalExpenseInput = z.infer<typeof createAnimalExpenseSchema>;
export type UpdateAnimalExpenseInput = z.infer<typeof updateAnimalExpenseSchema>;
export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;
export type UpdateLedgerEntryInput = z.infer<typeof updateLedgerEntrySchema>;
export type CreateRecurringTemplateInput = z.infer<typeof createRecurringTemplateSchema>;
export type UpdateRecurringTemplateInput = z.infer<typeof updateRecurringTemplateSchema>;
export type GenerateRecurringInput = z.infer<typeof generateRecurringSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
export type CreatePayrollLineInput = z.infer<typeof createPayrollLineSchema>;
export type CreateInstallmentRowInput = z.infer<typeof createInstallmentRowSchema>;
export type CreateSaleInstallmentPlanInput = z.infer<typeof createSaleInstallmentPlanSchema>;
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
export type SaleMapImportLotInput = z.infer<typeof saleMapImportLotSchema>;
export type ImportSaleMapInput = z.infer<typeof importSaleMapSchema>;
