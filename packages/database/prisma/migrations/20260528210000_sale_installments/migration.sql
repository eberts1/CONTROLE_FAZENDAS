-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('ABERTA', 'PAGA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "LedgerSource" ADD VALUE 'PARCELA_VENDA';

-- AlterTable
ALTER TABLE "AnimalSale" ADD COLUMN "auctionLotNumber" INTEGER;

-- AlterTable
ALTER TABLE "FarmLedgerEntry" ADD COLUMN "saleInstallmentId" TEXT;

-- CreateTable
CREATE TABLE "SaleInstallmentPlan" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "allocationId" TEXT,
    "buyerPartnerId" TEXT NOT NULL,
    "auctionLotNumber" INTEGER,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "bidValue" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleInstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleInstallment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'ABERTA',
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "paymentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleInstallmentPlan_allocationId_key" ON "SaleInstallmentPlan"("allocationId");

-- CreateIndex
CREATE INDEX "SaleInstallmentPlan_saleId_idx" ON "SaleInstallmentPlan"("saleId");

-- CreateIndex
CREATE INDEX "SaleInstallmentPlan_buyerPartnerId_idx" ON "SaleInstallmentPlan"("buyerPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleInstallment_planId_sequence_key" ON "SaleInstallment"("planId", "sequence");

-- CreateIndex
CREATE INDEX "SaleInstallment_planId_idx" ON "SaleInstallment"("planId");

-- CreateIndex
CREATE INDEX "SaleInstallment_dueDate_status_idx" ON "SaleInstallment"("dueDate", "status");

-- CreateIndex
CREATE INDEX "SaleInstallment_status_idx" ON "SaleInstallment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FarmLedgerEntry_saleInstallmentId_key" ON "FarmLedgerEntry"("saleInstallmentId");

-- AddForeignKey
ALTER TABLE "SaleInstallmentPlan" ADD CONSTRAINT "SaleInstallmentPlan_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AnimalSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallmentPlan" ADD CONSTRAINT "SaleInstallmentPlan_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "AnimalSaleAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallmentPlan" ADD CONSTRAINT "SaleInstallmentPlan_buyerPartnerId_fkey" FOREIGN KEY ("buyerPartnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallment" ADD CONSTRAINT "SaleInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaleInstallmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmLedgerEntry" ADD CONSTRAINT "FarmLedgerEntry_saleInstallmentId_fkey" FOREIGN KEY ("saleInstallmentId") REFERENCES "SaleInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
