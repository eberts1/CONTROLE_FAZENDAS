import {
  PrismaClient,
  AreaType,
  ProcessCategory,
  Role,
  FarmRole,
  AnimalSex,
  AnimalStatus,
  GeneticMaterialType,
  StockMovementType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@controlefazendas.com' },
    update: {},
    create: {
      email: 'admin@controlefazendas.com',
      password,
      name: 'Administrador',
      role: Role.ADMIN,
    },
  });

  const managerPassword = await bcrypt.hash('manager123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@controlefazendas.com' },
    update: {},
    create: {
      email: 'manager@controlefazendas.com',
      password: managerPassword,
      name: 'Gerente Demo',
      role: Role.MANAGER,
    },
  });

  const farm = await prisma.farm.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Fazenda São João',
      location: 'Goiás, Brasil',
    },
  });

  await prisma.farmUser.upsert({
    where: {
      userId_farmId: { userId: admin.id, farmId: farm.id },
    },
    update: {},
    create: {
      userId: admin.id,
      farmId: farm.id,
      role: FarmRole.OWNER,
    },
  });

  await prisma.farmUser.upsert({
    where: {
      userId_farmId: { userId: manager.id, farmId: farm.id },
    },
    update: {},
    create: {
      userId: manager.id,
      farmId: farm.id,
      role: FarmRole.MANAGER,
    },
  });

  const area1 = await prisma.area.upsert({
    where: { id: '00000000-0000-4000-8000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000101',
      farmId: farm.id,
      name: 'Pasto Norte',
      type: AreaType.PASTO,
      hectares: 120,
      description: 'Pastagem para gado de corte',
    },
  });

  const area2 = await prisma.area.upsert({
    where: { id: '00000000-0000-4000-8000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000102',
      farmId: farm.id,
      name: 'Talhão 03',
      type: AreaType.TALHAO,
      hectares: 45,
      description: 'Área de plantio de soja',
    },
  });

  const process1 = await prisma.process.upsert({
    where: { id: '00000000-0000-4000-8000-000000000201' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000201',
      farmId: farm.id,
      name: 'Plantio de Soja',
      category: ProcessCategory.PLANTIO,
      description: 'Plantio da safra de soja',
    },
  });

  const process2 = await prisma.process.upsert({
    where: { id: '00000000-0000-4000-8000-000000000202' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000202',
      farmId: farm.id,
      name: 'Rotação de Pasto',
      category: ProcessCategory.MANEJO,
      description: 'Manejo e rotação do gado',
    },
  });

  await prisma.processRecord.upsert({
    where: { id: '00000000-0000-4000-8000-000000000301' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000301',
      processId: process1.id,
      areaId: area2.id,
      performedAt: new Date('2026-03-15T08:00:00.000Z'),
      notes: 'Plantio concluído com sucesso',
      createdById: manager.id,
    },
  });

  await prisma.processRecord.upsert({
    where: { id: '00000000-0000-4000-8000-000000000302' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000302',
      processId: process2.id,
      areaId: area1.id,
      performedAt: new Date('2026-05-20T06:30:00.000Z'),
      notes: 'Gado transferido para área de descanso',
      createdById: manager.id,
    },
  });

  const bull = await prisma.animal.upsert({
    where: { id: '00000000-0000-4000-8000-000000000401' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000401',
      farmId: farm.id,
      tag: 'BR-001',
      name: 'Touro Campeão',
      breed: 'Nelore',
      sex: AnimalSex.MACHO,
      birthDate: new Date('2020-03-10'),
      status: AnimalStatus.ATIVO,
    },
  });

  const cow = await prisma.animal.upsert({
    where: { id: '00000000-0000-4000-8000-000000000402' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000402',
      farmId: farm.id,
      tag: 'BR-002',
      name: 'Matriz Estrela',
      breed: 'Angus',
      sex: AnimalSex.FEMEA,
      birthDate: new Date('2019-08-22'),
      status: AnimalStatus.ATIVO,
    },
  });

  await prisma.animal.upsert({
    where: { id: '00000000-0000-4000-8000-000000000403' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000403',
      farmId: farm.id,
      tag: 'BR-003',
      name: 'Reprodutor Jovem',
      breed: 'Nelore',
      sex: AnimalSex.MACHO,
      status: AnimalStatus.ATIVO,
    },
  });

  const semenLot = await prisma.geneticLot.upsert({
    where: { id: '00000000-0000-4000-8000-000000000501' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000501',
      farmId: farm.id,
      sourceAnimalId: bull.id,
      materialType: GeneticMaterialType.SEMEN,
      lotCode: 'SEM-2026-01',
      collectedAt: new Date('2026-01-15'),
      initialDoses: 50,
      storageTank: 'Tanque A',
      storageCanister: 'Caneca 3',
      storagePosition: 'Posição 12',
      laboratory: 'Lab GenBov',
      expiresAt: new Date('2027-01-15'),
    },
  });

  await prisma.stockMovement.upsert({
    where: { id: '00000000-0000-4000-8000-000000000601' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000601',
      geneticLotId: semenLot.id,
      type: StockMovementType.ENTRADA,
      quantity: 50,
      reason: 'Cadastro do lote',
      referenceDate: new Date('2026-01-15'),
      createdById: manager.id,
    },
  });

  await prisma.stockMovement.upsert({
    where: { id: '00000000-0000-4000-8000-000000000602' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000602',
      geneticLotId: semenLot.id,
      type: StockMovementType.SAIDA,
      quantity: 5,
      reason: 'Venda',
      referenceDate: new Date('2026-04-01'),
      createdById: manager.id,
    },
  });

  const embryoLot = await prisma.geneticLot.upsert({
    where: { id: '00000000-0000-4000-8000-000000000502' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000502',
      farmId: farm.id,
      sourceAnimalId: cow.id,
      materialType: GeneticMaterialType.EMBRIAO,
      lotCode: 'EMB-2026-02',
      collectedAt: new Date('2026-02-20'),
      initialDoses: 20,
      storageTank: 'Tanque B',
      storageCanister: 'Caneca 1',
      expiresAt: new Date('2026-08-20'),
    },
  });

  await prisma.stockMovement.upsert({
    where: { id: '00000000-0000-4000-8000-000000000603' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000603',
      geneticLotId: embryoLot.id,
      type: StockMovementType.ENTRADA,
      quantity: 20,
      reason: 'Cadastro do lote',
      referenceDate: new Date('2026-02-20'),
      createdById: manager.id,
    },
  });

  console.log('Seed concluído!');
  console.log('Admin: admin@controlefazendas.com / admin123');
  console.log('Manager: manager@controlefazendas.com / manager123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
