-- AlterEnum AnimalSaleType
ALTER TYPE "AnimalSaleType" ADD VALUE IF NOT EXISTS 'SERVICO_ACASALAMENTO';

-- CreateEnum
CREATE TYPE "FarmEventType" AS ENUM ('LEILAO', 'VENDA_EXTERNA', 'VENDA_FAZENDA', 'OUTRO');
CREATE TYPE "FarmEventStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE "SaleAssetScope" AS ENUM ('PRODUTO_GENETICO', 'SERVICO_REPRODUTIVO', 'COTA_ANIMAL', 'ANIMAL_INTEIRO');

-- CreateTable FarmEvent
CREATE TABLE "FarmEvent" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "type" "FarmEventType" NOT NULL,
    "status" "FarmEventStatus" NOT NULL DEFAULT 'PLANEJADO',
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "organizer" TEXT,
    "commissionPercent" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable AnimalOwnershipHistory
CREATE TABLE "AnimalOwnershipHistory" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "saleId" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalOwnershipHistory_pkey" PRIMARY KEY ("id")
);

-- AlterTable AnimalSale
ALTER TABLE "AnimalSale" ADD COLUMN "eventId" TEXT,
ADD COLUMN "assetScope" "SaleAssetScope",
ADD COLUMN "quotaPercent" DECIMAL(5,2),
ADD COLUMN "applyOwnershipTransfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "buyerPartnerId" TEXT,
ADD COLUMN "sellerPartnerIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable AnimalExpense
ALTER TABLE "AnimalExpense" ADD COLUMN "eventId" TEXT;

-- CreateIndex
CREATE INDEX "FarmEvent_farmId_idx" ON "FarmEvent"("farmId");
CREATE UNIQUE INDEX "AnimalOwnershipHistory_saleId_key" ON "AnimalOwnershipHistory"("saleId");
CREATE INDEX "AnimalOwnershipHistory_animalId_idx" ON "AnimalOwnershipHistory"("animalId");
CREATE INDEX "AnimalSale_eventId_idx" ON "AnimalSale"("eventId");
CREATE INDEX "AnimalSale_buyerPartnerId_idx" ON "AnimalSale"("buyerPartnerId");
CREATE INDEX "AnimalExpense_eventId_idx" ON "AnimalExpense"("eventId");

-- AddForeignKey
ALTER TABLE "FarmEvent" ADD CONSTRAINT "FarmEvent_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimalOwnershipHistory" ADD CONSTRAINT "AnimalOwnershipHistory_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimalOwnershipHistory" ADD CONSTRAINT "AnimalOwnershipHistory_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AnimalSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnimalSale" ADD CONSTRAINT "AnimalSale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FarmEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnimalSale" ADD CONSTRAINT "AnimalSale_buyerPartnerId_fkey" FOREIGN KEY ("buyerPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnimalExpense" ADD CONSTRAINT "AnimalExpense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FarmEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
