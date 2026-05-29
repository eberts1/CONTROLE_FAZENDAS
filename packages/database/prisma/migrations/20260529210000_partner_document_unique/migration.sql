-- Partial unique index: document must be unique per farm when not null
CREATE UNIQUE INDEX "Partner_farmId_document_key" ON "Partner"("farmId", "document") WHERE "document" IS NOT NULL;
