export * from './enums';
export * from './schemas';
export * from './abcz';
export * from './abcz-profile';
export * from './genealogy-pedigree';
export * from './animal-identity';
export * from './kinship';
export * from './finance-allocation.util';
export * from './ownership-transfer.util';
export * from './finance-labels';
export * from './ledger-mirror.util';
export * from './sale-map-parser.util';
export * from './bula-remates-sale-map-parser.util';
export * from './sale-map-import.util';
export * from './partner-document.util';
export * from './bula-buyer-list-parser.util';
export * from './partner-match.util';
export * from './partner-duplicate.util';

export interface SaleInstallmentDto {
  id: string;
  planId: string;
  sequence: number;
  label: string;
  amount: number;
  dueDate: string;
  status: import('./enums').InstallmentStatus;
  effectiveStatus: 'ABERTA' | 'VENCIDA' | 'PAGA' | 'CANCELADA';
  paidAt: string | null;
  paidAmount: number | null;
  paymentNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaleInstallmentPlanDto {
  id: string;
  saleId: string;
  allocationId: string | null;
  buyerPartnerId: string;
  auctionLotNumber: number | null;
  netAmount: number;
  bidValue: number | null;
  notes: string | null;
  installments: SaleInstallmentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleInstallmentListItemDto extends SaleInstallmentDto {
  plan: {
    id: string;
    saleId: string;
    auctionLotNumber: number | null;
    netAmount: number;
    bidValue: number | null;
  };
  buyer: {
    id: string;
    name: string;
  };
  sale: {
    id: string;
    description: string;
    animalId: string;
    eventId: string | null;
    animalTag: string | null;
    animalName: string | null;
    eventName: string | null;
  };
}

export interface InstallmentsSummaryDto {
  openCount: number;
  openAmount: number;
  overdueCount: number;
  overdueAmount: number;
  dueThisMonthCount: number;
  dueThisMonthAmount: number;
  paidCount: number;
  paidAmount: number;
}

export interface SaleMapImportInstallmentPreview {
  sequence: number;
  label: string;
  amount: number;
  dueDate: string;
  markAsPaid: boolean;
  paidAt: string | null;
}

export interface SaleMapImportLotPreview {
  tempId: string;
  selected: boolean;
  canal: number;
  description: string | null;
  registration: string | null;
  animalId: string | null;
  animalTag: string | null;
  animalName: string | null;
  createAnimal: boolean;
  suggestedAnimalTag: string | null;
  buyerName: string | null;
  buyerPartnerId: string | null;
  createBuyer: boolean;
  bidValue: number | null;
  captures: number;
  quantity: number;
  totalAmount: number | null;
  netAmount: number | null;
  discountAmount: number | null;
  entryAmount: number | null;
  isCashPayment: boolean;
  installments: SaleMapImportInstallmentPreview[];
  warnings: string[];
}

export interface SaleMapImportPreviewDto {
  document: {
    eventName: string | null;
    eventDate: string | null;
    location: string | null;
    sellerName: string | null;
    lotCount: number;
    sourceFormat?: 'PROGRAMA_LEILOES' | 'BULA_REMATES';
  };
  lots: SaleMapImportLotPreview[];
}

export interface SaleMapImportResultDto {
  imported: number;
  skipped: number;
  salesCreated: string[];
  partnersCreated: string[];
  animalsCreated: string[];
  warnings: string[];
}

export interface SaleMapSyncInstallmentsResultDto {
  synced: number;
  skipped: number;
  alreadyHasPlan: number;
  warnings: string[];
}

export interface PartnerImportRowPreview {
  tempId: string;
  selected: boolean;
  parsed: {
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    phone2: string | null;
    phone3: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    ranchName: string | null;
    ranchCity: string | null;
    ranchState: string | null;
    ranchRegistration: string | null;
    rawBlock: string;
  };
  matchedPartnerId: string | null;
  matchedPartnerName: string | null;
  matchType: import('./partner-match.util').PartnerMatchType | null;
  action: import('./partner-match.util').PartnerImportAction;
  fieldsToFill: import('./partner-match.util').PartnerFieldFill[];
}

export interface PartnerImportPreviewDto {
  document: {
    title: string | null;
    buyerCount: number;
    sourceFormat: 'BULA_BUYER_LIST';
  };
  rows: PartnerImportRowPreview[];
}

export interface PartnerImportResultDto {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface PartnerLinkCounts {
  ownerships: number;
  salesAsBuyer: number;
  installmentPlans: number;
  saleAllocations: number;
  expenseAllocations: number;
  ledgerEntries: number;
  salesAsSeller: number;
  total: number;
}

export interface PartnerDuplicateEntryDto extends PartnerDto {
  linkCounts: PartnerLinkCounts;
}

export interface PartnerDuplicateGroupDto {
  groupId: string;
  reason: import('./partner-duplicate.util').DuplicateGroupReason;
  confidence: 'high' | 'medium';
  reviewRequired: boolean;
  suggestedKeepId: string;
  partners: PartnerDuplicateEntryDto[];
}

export interface PartnerMergeResultDto {
  keptPartnerId: string;
  mergedPartnerIds: string[];
  fieldsFilled: string[];
}

export interface PartnerPurchaseItemDto {
  id: string;
  description: string;
  totalAmount: number;
  transactionDate: string;
  type: import('./enums').AnimalSaleType;
  applyOwnershipTransfer: boolean;
  quotaPercent: number | null;
  animalTag: string | null;
  animalName: string | null;
  eventName: string | null;
}

export interface PartnerFinancialSummaryDto {
  totalRevenue: number;
  totalExpense: number;
  balance: number;
}

export interface PartnerDetailDto {
  partner: PartnerDto;
  linkCounts: PartnerLinkCounts;
  purchases: PartnerPurchaseItemDto[];
  installmentsSummary: InstallmentsSummaryDto;
  installments: SaleInstallmentListItemDto[];
  ledgerEntries: FarmLedgerEntryDto[];
  financialSummary: PartnerFinancialSummaryDto;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: import('./enums').Role;
  blocked?: boolean;
  blockedAt?: string | null;
  createdAt: string;
}

export interface ResetPasswordResultDto {
  temporaryPassword: string;
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
  pelagem: string | null;
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
  ownership?: AnimalOwnershipDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerDto {
  id: string;
  farmId: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  phone3: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  ranchName: string | null;
  ranchCity: string | null;
  ranchState: string | null;
  ranchRegistration: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnimalOwnershipDto {
  id: string;
  animalId: string;
  partnerId: string;
  ownershipPercent: number;
  isPrimary: boolean;
  partner?: PartnerDto;
  createdAt: string;
  updatedAt: string;
}

export interface AnimalSaleAllocationDto {
  id: string;
  saleId: string;
  partnerId: string;
  ownershipPercent: number;
  grossAmount: number;
  discountPercent: number | null;
  discountPercent2: number | null;
  discountAmount: number;
  netAmount: number;
  entryAmount: number | null;
  partner?: PartnerDto;
}

export interface FarmEventDto {
  id: string;
  farmId: string;
  type: import('./enums').FarmEventType;
  status: import('./enums').FarmEventStatus;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  organizer: string | null;
  commissionPercent: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FarmEventSummaryDto {
  event: FarmEventDto;
  salesCount: number;
  totalSales: number;
  expensesCount: number;
  totalExpenses: number;
  totalReceived: number;
  openReceivable: number;
  balance: number;
  auctionLotNumbers: number[];
}

export interface FarmEventListItemDto extends FarmEventDto {
  salesCount: number;
  totalSales: number;
  expensesCount: number;
  totalExpenses: number;
  totalReceived: number;
  openReceivable: number;
  balance: number;
  auctionLotNumbers: number[];
}

export interface AnimalSaleDto {
  id: string;
  animalId: string;
  farmId: string;
  eventId: string | null;
  type: import('./enums').AnimalSaleType;
  assetScope: import('./enums').SaleAssetScope | null;
  quotaPercent: number | null;
  applyOwnershipTransfer: boolean;
  buyerPartnerId: string | null;
  sellerPartnerIds: string[];
  description: string;
  totalAmount: number;
  transactionDate: string;
  commissionPercent: number | null;
  paymentCondition: import('./enums').PaymentCondition | null;
  unitValue: number | null;
  quantity: number | null;
  captures: number | null;
  notes: string | null;
  createdById: string;
  allocations: AnimalSaleAllocationDto[];
  event?: FarmEventDto;
  buyerPartner?: PartnerDto;
  createdAt: string;
  updatedAt: string;
}

export interface FarmEventSaleListItemDto extends AnimalSaleDto {
  animal?: Pick<AnimalDto, 'id' | 'tag' | 'name' | 'status'>;
}

export interface AnimalExpenseAllocationDto {
  id: string;
  expenseId: string;
  partnerId: string;
  ownershipPercent: number;
  allocatedAmount: number;
  partner?: PartnerDto;
}

export interface AnimalExpenseDto {
  id: string;
  animalId: string;
  farmId: string;
  eventId: string | null;
  type: import('./enums').AnimalExpenseType;
  description: string;
  totalAmount: number;
  expenseDate: string;
  splitAmongPartners: boolean;
  notes: string | null;
  createdById: string;
  allocations: AnimalExpenseAllocationDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AnimalFinanceSummaryDto {
  totalSales: number;
  totalExpenses: number;
  balance: number;
  byPartner: Array<{
    partnerId: string;
    partnerName: string;
    salesNet: number;
    expenses: number;
    balance: number;
  }>;
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

export interface FarmLedgerEntryDto {
  id: string;
  farmId: string;
  section: import('./enums').FinanceSection;
  type: import('./enums').LedgerEntryType;
  category: import('./enums').LedgerCategory;
  scope: import('./enums').LedgerScope;
  source: import('./enums').LedgerSource;
  description: string;
  amount: number;
  entryDate: string;
  dueDate: string | null;
  paidAt: string | null;
  eventId: string | null;
  event?: Pick<FarmEventDto, 'id' | 'name' | 'type' | 'status'>;
  animalId: string | null;
  areaId: string | null;
  employeeId: string | null;
  partnerId: string | null;
  animalSaleId: string | null;
  animalExpenseId: string | null;
  saleInstallmentId: string | null;
  recurringTemplateId: string | null;
  payrollRunId: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FarmFinanceSummaryDto {
  from: string;
  to: string;
  totalRevenue: number;
  totalExpense: number;
  balance: number;
  bySection: Array<{
    section: import('./enums').FinanceSection;
    revenue: number;
    expense: number;
    balance: number;
  }>;
}

export interface RecurringLedgerTemplateDto {
  id: string;
  farmId: string;
  section: import('./enums').FinanceSection;
  type: import('./enums').LedgerEntryType;
  category: import('./enums').LedgerCategory;
  description: string;
  amount: number;
  frequency: import('./enums').RecurrenceFrequency;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDto {
  id: string;
  farmId: string;
  name: string;
  document: string | null;
  role: string | null;
  baseSalary: number | null;
  admissionDate: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollLineDto {
  id: string;
  payrollRunId: string;
  employeeId: string;
  description: string | null;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  employee?: EmployeeDto;
}

export interface PayrollRunDto {
  id: string;
  farmId: string;
  referenceMonth: string;
  status: import('./enums').PayrollRunStatus;
  description: string | null;
  totalAmount: number;
  paidAt: string | null;
  createdById: string;
  lines: PayrollLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserDto;
  farms: FarmDto[];
}
