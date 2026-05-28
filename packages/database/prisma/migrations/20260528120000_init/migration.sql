-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "FarmRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('PASTO', 'TALHAO', 'GALPAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "ProcessCategory" AS ENUM ('PLANTIO', 'COLHEITA', 'MANEJO', 'IRRIGACAO', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmUser" (
    "userId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "role" "FarmRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmUser_pkey" PRIMARY KEY ("userId","farmId")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AreaType" NOT NULL,
    "hectares" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProcessCategory" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessRecord" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FarmUser_farmId_idx" ON "FarmUser"("farmId");

-- CreateIndex
CREATE INDEX "Area_farmId_idx" ON "Area"("farmId");

-- CreateIndex
CREATE INDEX "Process_farmId_idx" ON "Process"("farmId");

-- CreateIndex
CREATE INDEX "ProcessRecord_processId_idx" ON "ProcessRecord"("processId");

-- CreateIndex
CREATE INDEX "ProcessRecord_areaId_idx" ON "ProcessRecord"("areaId");

-- CreateIndex
CREATE INDEX "ProcessRecord_createdById_idx" ON "ProcessRecord"("createdById");

-- AddForeignKey
ALTER TABLE "FarmUser" ADD CONSTRAINT "FarmUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmUser" ADD CONSTRAINT "FarmUser_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRecord" ADD CONSTRAINT "ProcessRecord_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRecord" ADD CONSTRAINT "ProcessRecord_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRecord" ADD CONSTRAINT "ProcessRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
