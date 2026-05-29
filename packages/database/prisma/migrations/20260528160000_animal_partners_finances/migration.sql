-- CreateEnum
CREATE TYPE "AnimalSaleType" AS ENUM ('ASPIRACAO', 'VENDA_ANIMAL', 'VENDA_SEMEN', 'VENDA_EMBRIAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PaymentCondition" AS ENUM ('A_VISTA', 'PARCELADO');

-- CreateEnum
CREATE TYPE "AnimalExpenseType" AS ENUM ('VETERINARIO', 'ALIMENTACAO', 'MANEJO', 'REPRODUCAO', 'OUTRO');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalOwnership" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ownershipPercent" DECIMAL(5,2) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimalOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalSale" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "type" "AnimalSaleType" NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "commissionPercent" DECIMAL(5,2),
    "paymentCondition" "PaymentCondition",
    "unitValue" DECIMAL(12,2),
    "quantity" INTEGER,
    "captures" INTEGER,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimalSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalSaleAllocation" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ownershipPercent" DECIMAL(5,2) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "discountPercent2" DECIMAL(5,2),
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "entryAmount" DECIMAL(12,2),

    CONSTRAINT "AnimalSaleAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalExpense" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "type" "AnimalExpenseType" NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "splitAmongPartners" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimalExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalExpenseAllocation" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ownershipPercent" DECIMAL(5,2) NOT NULL,
    "allocatedAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "AnimalExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Partner_farmId_idx" ON "Partner"("farmId");

-- CreateIndex
CREATE INDEX "AnimalOwnership_animalId_idx" ON "AnimalOwnership"("animalId");

-- CreateIndex
CREATE INDEX "AnimalOwnership_partnerId_idx" ON "AnimalOwnership"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimalOwnership_animalId_partnerId_key" ON "AnimalOwnership"("animalId", "partnerId");

-- CreateIndex
CREATE INDEX "AnimalSale_animalId_idx" ON "AnimalSale"("animalId");

-- CreateIndex
CREATE INDEX "AnimalSale_farmId_idx" ON "AnimalSale"("farmId");

-- CreateIndex
CREATE INDEX "AnimalSale_createdById_idx" ON "AnimalSale"("createdById");

-- CreateIndex
CREATE INDEX "AnimalSaleAllocation_saleId_idx" ON "AnimalSaleAllocation"("saleId");

-- CreateIndex
CREATE INDEX "AnimalSaleAllocation_partnerId_idx" ON "AnimalSaleAllocation"("partnerId");

-- CreateIndex
CREATE INDEX "AnimalExpense_animalId_idx" ON "AnimalExpense"("animalId");

-- CreateIndex
CREATE INDEX "AnimalExpense_farmId_idx" ON "AnimalExpense"("farmId");

-- CreateIndex
CREATE INDEX "AnimalExpense_createdById_idx" ON "AnimalExpense"("createdById");

-- CreateIndex
CREATE INDEX "AnimalExpenseAllocation_expenseId_idx" ON "AnimalExpenseAllocation"("expenseId");

-- CreateIndex
CREATE INDEX "AnimalExpenseAllocation_partnerId_idx" ON "AnimalExpenseAllocation"("partnerId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalOwnership" ADD CONSTRAINT "AnimalOwnership_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalOwnership" ADD CONSTRAINT "AnimalOwnership_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalSale" ADD CONSTRAINT "AnimalSale_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalSale" ADD CONSTRAINT "AnimalSale_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalSale" ADD CONSTRAINT "AnimalSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalSaleAllocation" ADD CONSTRAINT "AnimalSaleAllocation_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AnimalSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalSaleAllocation" ADD CONSTRAINT "AnimalSaleAllocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalExpense" ADD CONSTRAINT "AnimalExpense_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalExpense" ADD CONSTRAINT "AnimalExpense_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalExpense" ADD CONSTRAINT "AnimalExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalExpenseAllocation" ADD CONSTRAINT "AnimalExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "AnimalExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalExpenseAllocation" ADD CONSTRAINT "AnimalExpenseAllocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
