-- CreateEnum
CREATE TYPE "AnimalManagementCategory" AS ENUM ('SAUDE', 'REPRODUTIVO', 'NUTRICAO', 'MANEJO_GERAL');

-- CreateEnum
CREATE TYPE "AnimalManagementEventType" AS ENUM (
  'OBSERVACAO_CLINICA',
  'TRATAMENTO_DOENCA',
  'MEDICACAO',
  'VACINACAO',
  'EXAME',
  'INSEMINACAO',
  'DOADOR_INSEMINACAO',
  'MONTA_NATURAL',
  'DIAGNOSTICO_GESTACAO',
  'PARTO_ABORTO',
  'SUPLEMENTACAO',
  'MUDANCA_DIETA',
  'PESAGEM',
  'MOVIMENTACAO',
  'IDENTIFICACAO',
  'OUTRO'
);

-- CreateTable
CREATE TABLE "AnimalManagementRecord" (
  "id" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "animalId" TEXT NOT NULL,
  "category" "AnimalManagementCategory" NOT NULL,
  "eventType" "AnimalManagementEventType" NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "relatedAnimalId" TEXT,
  "metadata" JSONB,
  "expenseId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AnimalManagementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnimalManagementRecord_expenseId_key" ON "AnimalManagementRecord"("expenseId");

-- CreateIndex
CREATE INDEX "AnimalManagementRecord_animalId_performedAt_idx" ON "AnimalManagementRecord"("animalId", "performedAt");

-- CreateIndex
CREATE INDEX "AnimalManagementRecord_farmId_category_idx" ON "AnimalManagementRecord"("farmId", "category");

-- CreateIndex
CREATE INDEX "AnimalManagementRecord_relatedAnimalId_idx" ON "AnimalManagementRecord"("relatedAnimalId");

-- CreateIndex
CREATE INDEX "AnimalManagementRecord_createdById_idx" ON "AnimalManagementRecord"("createdById");

-- AddForeignKey
ALTER TABLE "AnimalManagementRecord" ADD CONSTRAINT "AnimalManagementRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalManagementRecord" ADD CONSTRAINT "AnimalManagementRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalManagementRecord" ADD CONSTRAINT "AnimalManagementRecord_relatedAnimalId_fkey" FOREIGN KEY ("relatedAnimalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalManagementRecord" ADD CONSTRAINT "AnimalManagementRecord_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "AnimalExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalManagementRecord" ADD CONSTRAINT "AnimalManagementRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
