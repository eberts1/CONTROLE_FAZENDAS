-- AlterTable
ALTER TABLE "Animal" ADD COLUMN "sireId" TEXT;
ALTER TABLE "Animal" ADD COLUMN "damId" TEXT;

-- CreateIndex
CREATE INDEX "Animal_sireId_idx" ON "Animal"("sireId");
CREATE INDEX "Animal_damId_idx" ON "Animal"("damId");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_damId_fkey" FOREIGN KEY ("damId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
