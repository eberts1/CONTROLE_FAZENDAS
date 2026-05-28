-- AlterTable
ALTER TABLE "Animal" ADD COLUMN "abczOwnerId" TEXT;

-- CreateTable
CREATE TABLE "AnimalAbczSnapshot" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "permissions" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT,
    "coat" TEXT,
    "city" TEXT,
    "state" TEXT,
    "situation" TEXT,
    "owner" TEXT,
    "farmName" TEXT,
    "breeder" TEXT,
    "reproductiveMessage" TEXT,
    "efficiencyMessage" TEXT,
    "reproductiveData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimalAbczSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalGenealogyEntry" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abczAnimalId" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "AnimalGenealogyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalGeneticEvaluation" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "period" TEXT,
    "evaluationKind" TEXT,
    "iabcz" TEXT,
    "deca" TEXT,
    "inbreedingF" TEXT,
    "deps" JSONB NOT NULL,

    CONSTRAINT "AnimalGeneticEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnimalAbczSnapshot_animalId_key" ON "AnimalAbczSnapshot"("animalId");

-- CreateIndex
CREATE INDEX "AnimalGenealogyEntry_animalId_idx" ON "AnimalGenealogyEntry"("animalId");

-- CreateIndex
CREATE INDEX "AnimalGenealogyEntry_snapshotId_idx" ON "AnimalGenealogyEntry"("snapshotId");

-- CreateIndex
CREATE INDEX "AnimalGeneticEvaluation_animalId_idx" ON "AnimalGeneticEvaluation"("animalId");

-- CreateIndex
CREATE INDEX "AnimalGeneticEvaluation_snapshotId_idx" ON "AnimalGeneticEvaluation"("snapshotId");

-- AddForeignKey
ALTER TABLE "AnimalAbczSnapshot" ADD CONSTRAINT "AnimalAbczSnapshot_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalGenealogyEntry" ADD CONSTRAINT "AnimalGenealogyEntry_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AnimalAbczSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalGeneticEvaluation" ADD CONSTRAINT "AnimalGeneticEvaluation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AnimalAbczSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
