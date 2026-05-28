-- AlterTable
ALTER TABLE "Animal" ADD COLUMN "abczAnimalId" TEXT;
ALTER TABLE "Animal" ADD COLUMN "abczSerie" TEXT;
ALTER TABLE "Animal" ADD COLUMN "abczRgn" TEXT;
ALTER TABLE "Animal" ADD COLUMN "abczRgd" TEXT;
ALTER TABLE "Animal" ADD COLUMN "abczBreedCode" INTEGER;
ALTER TABLE "Animal" ADD COLUMN "abczCategoryCode" INTEGER;
ALTER TABLE "Animal" ADD COLUMN "abczSyncedAt" TIMESTAMP(3);
ALTER TABLE "Animal" ADD COLUMN "abczSourceUrl" TEXT;
