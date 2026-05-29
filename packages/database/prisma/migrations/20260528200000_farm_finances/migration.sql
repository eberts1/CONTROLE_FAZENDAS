-- CreateEnum
CREATE TYPE "FinanceSection" AS ENUM ('COTIDIANO', 'FIXOS_RECORRENTES', 'OPERACIONAL', 'PESSOAL_FOLHA', 'PECUARIA_EVENTOS', 'INVESTIMENTOS', 'PARCEIROS');
CREATE TYPE "LedgerEntryType" AS ENUM ('RECEITA', 'DESPESA');
CREATE TYPE "LedgerScope" AS ENUM ('FAZENDA', 'EVENTO', 'ANIMAL', 'ANIMAL_EVENTO', 'AREA', 'FUNCIONARIO');
CREATE TYPE "LedgerCategory" AS ENUM (
  'VENDA_ANIMAL', 'VENDA_GENETICO', 'OUTRA_RECEITA', 'APORTE_PARCEIRO',
  'COMPRA_INSUMO', 'COMBUSTIVEL', 'MANUTENCAO', 'ALIMENTACAO', 'VETERINARIO', 'REPRODUCAO',
  'DESLOCAMENTO', 'COMISSAO_LEILAO', 'HOSPEDAGEM', 'ENERGIA', 'AGUA', 'TELEFONE_INTERNET',
  'ARRENDAMENTO', 'SEGURO', 'FINANCIAMENTO', 'IMPOSTO_TAXA', 'SALARIO', 'FERIAS_13', 'ENCARGOS',
  'ADIANTAMENTO', 'BENEFICIO', 'MAQUINA_EQUIPAMENTO', 'BENFEITORIA', 'TERRA_MELHORIA',
  'DISTRIBUICAO_PARCEIRO', 'OUTRA_DESPESA'
);
CREATE TYPE "LedgerSource" AS ENUM ('MANUAL', 'ANIMAL_SALE', 'ANIMAL_EXPENSE', 'RECORRENTE', 'FOLHA_PAGAMENTO');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');
CREATE TYPE "PayrollRunStatus" AS ENUM ('RASCUNHO', 'FECHADO', 'PAGO');

-- CreateTable
CREATE TABLE "FarmLedgerEntry" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "section" "FinanceSection" NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "scope" "LedgerScope" NOT NULL DEFAULT 'FAZENDA',
    "source" "LedgerSource" NOT NULL DEFAULT 'MANUAL',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "eventId" TEXT,
    "animalId" TEXT,
    "areaId" TEXT,
    "employeeId" TEXT,
    "partnerId" TEXT,
    "animalSaleId" TEXT,
    "animalExpenseId" TEXT,
    "recurringTemplateId" TEXT,
    "payrollRunId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringLedgerTemplate" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "section" "FinanceSection" NOT NULL DEFAULT 'FIXOS_RECORRENTES',
    "type" "LedgerEntryType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'MENSAL',
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringLedgerTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "role" TEXT,
    "baseSalary" DECIMAL(12,2),
    "admissionDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "referenceMonth" TIMESTAMP(3) NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'RASCUNHO',
    "description" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "description" TEXT,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmLedgerEntry_animalSaleId_key" ON "FarmLedgerEntry"("animalSaleId");
CREATE UNIQUE INDEX "FarmLedgerEntry_animalExpenseId_key" ON "FarmLedgerEntry"("animalExpenseId");
CREATE INDEX "FarmLedgerEntry_farmId_idx" ON "FarmLedgerEntry"("farmId");
CREATE INDEX "FarmLedgerEntry_section_idx" ON "FarmLedgerEntry"("section");
CREATE INDEX "FarmLedgerEntry_entryDate_idx" ON "FarmLedgerEntry"("entryDate");
CREATE INDEX "FarmLedgerEntry_eventId_idx" ON "FarmLedgerEntry"("eventId");
CREATE INDEX "FarmLedgerEntry_animalId_idx" ON "FarmLedgerEntry"("animalId");
CREATE INDEX "FarmLedgerEntry_createdById_idx" ON "FarmLedgerEntry"("createdById");
CREATE INDEX "RecurringLedgerTemplate_farmId_idx" ON "RecurringLedgerTemplate"("farmId");
CREATE INDEX "Employee_farmId_idx" ON "Employee"("farmId");
CREATE UNIQUE INDEX "PayrollRun_farmId_referenceMonth_key" ON "PayrollRun"("farmId", "referenceMonth");
CREATE INDEX "PayrollRun_farmId_idx" ON "PayrollRun"("farmId");
CREATE UNIQUE INDEX "PayrollLine_payrollRunId_employeeId_key" ON "PayrollLine"("payrollRunId", "employeeId");
CREATE INDEX "PayrollLine_payrollRunId_idx" ON "PayrollLine"("payrollRunId");
CREATE INDEX "PayrollLine_employeeId_idx" ON "PayrollLine"("employeeId");

-- AddForeignKey
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FarmEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_animalSaleId_fkey" FOREIGN KEY ("animalSaleId") REFERENCES "AnimalSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_animalExpenseId_fkey" FOREIGN KEY ("animalExpenseId") REFERENCES "AnimalExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringLedgerTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringLedgerTemplate" ADD CONSTRAINT "RecurringLedgerTemplate_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
