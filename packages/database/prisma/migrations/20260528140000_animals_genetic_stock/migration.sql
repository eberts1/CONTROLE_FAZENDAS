-- CreateEnum
CREATE TYPE "AnimalSex" AS ENUM ('MACHO', 'FEMEA');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('ATIVO', 'VENDIDO', 'MORTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "GeneticMaterialType" AS ENUM ('SEMEN', 'EMBRIAO');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT,
    "breed" TEXT,
    "sex" "AnimalSex" NOT NULL,
    "birthDate" TIMESTAMP(3),
    "status" "AnimalStatus" NOT NULL DEFAULT 'ATIVO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneticLot" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "sourceAnimalId" TEXT NOT NULL,
    "materialType" "GeneticMaterialType" NOT NULL,
    "lotCode" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "initialDoses" INTEGER NOT NULL,
    "storageTank" TEXT,
    "storageCanister" TEXT,
    "storagePosition" TEXT,
    "laboratory" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneticLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "geneticLotId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Animal_farmId_idx" ON "Animal"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_farmId_tag_key" ON "Animal"("farmId", "tag");

-- CreateIndex
CREATE INDEX "GeneticLot_farmId_idx" ON "GeneticLot"("farmId");

-- CreateIndex
CREATE INDEX "GeneticLot_sourceAnimalId_idx" ON "GeneticLot"("sourceAnimalId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneticLot_farmId_lotCode_key" ON "GeneticLot"("farmId", "lotCode");

-- CreateIndex
CREATE INDEX "StockMovement_geneticLotId_idx" ON "StockMovement"("geneticLotId");

-- CreateIndex
CREATE INDEX "StockMovement_createdById_idx" ON "StockMovement"("createdById");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneticLot" ADD CONSTRAINT "GeneticLot_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneticLot" ADD CONSTRAINT "GeneticLot_sourceAnimalId_fkey" FOREIGN KEY ("sourceAnimalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_geneticLotId_fkey" FOREIGN KEY ("geneticLotId") REFERENCES "GeneticLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
