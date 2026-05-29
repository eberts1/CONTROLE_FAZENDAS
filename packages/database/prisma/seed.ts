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
  AnimalSaleType,
  PaymentCondition,
  AnimalExpenseType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
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

  const partnerCasaBranca = await prisma.partner.upsert({
    where: { id: '00000000-0000-4000-8000-000000000701' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000701',
      farmId: farm.id,
      name: 'Casa Branca Agropastoril Ltda',
      document: '12.345.678/0001-90',
    },
  });

  const partnerDaniella = await prisma.partner.upsert({
    where: { id: '00000000-0000-4000-8000-000000000702' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000702',
      farmId: farm.id,
      name: 'Daniella de Souza Pinto Muradás',
      document: '123.456.789-00',
    },
  });

  await prisma.partner.upsert({
    where: { id: '00000000-0000-4000-8000-000000000703' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000703',
      farmId: farm.id,
      name: farm.name,
    },
  });

  await prisma.animalOwnership.upsert({
    where: { id: '00000000-0000-4000-8000-000000000711' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000711',
      animalId: bull.id,
      partnerId: partnerCasaBranca.id,
      ownershipPercent: new Decimal(100),
      isPrimary: true,
    },
  });

  await prisma.animalOwnership.upsert({
    where: { id: '00000000-0000-4000-8000-000000000712' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000712',
      animalId: cow.id,
      partnerId: partnerCasaBranca.id,
      ownershipPercent: new Decimal(50),
      isPrimary: true,
    },
  });

  await prisma.animalOwnership.upsert({
    where: { id: '00000000-0000-4000-8000-000000000713' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000713',
      animalId: cow.id,
      partnerId: partnerDaniella.id,
      ownershipPercent: new Decimal(50),
      isPrimary: false,
    },
  });

  const aspirationSale = await prisma.animalSale.upsert({
    where: { id: '00000000-0000-4000-8000-000000000721' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000721',
      animalId: cow.id,
      farmId: farm.id,
      type: AnimalSaleType.ASPIRACAO,
      description:
        'ASPIRAÇÃO - Nelore PO (REM2484N FIV GENETICA ADITIVA X LIVRE ACASALAMENTO)',
      totalAmount: new Decimal(285000),
      transactionDate: new Date('2026-05-15'),
      commissionPercent: new Decimal(8),
      paymentCondition: PaymentCondition.A_VISTA,
      unitValue: new Decimal(9500),
      quantity: 1,
      captures: 30,
      createdById: manager.id,
    },
  });

  for (const [index, partner] of [partnerCasaBranca, partnerDaniella].entries()) {
    const gross = new Decimal(142500);
    const discount = new Decimal(21375);
    const net = new Decimal(121125);
    await prisma.animalSaleAllocation.upsert({
      where: { id: `00000000-0000-4000-8000-00000000073${index}` },
      update: {},
      create: {
        id: `00000000-0000-4000-8000-00000000073${index}`,
        saleId: aspirationSale.id,
        partnerId: partner.id,
        ownershipPercent: new Decimal(50),
        grossAmount: gross,
        discountPercent: new Decimal(15),
        discountPercent2: new Decimal(0),
        discountAmount: discount,
        netAmount: net,
        entryAmount: net,
      },
    });
  }

  const sharedExpense = await prisma.animalExpense.upsert({
    where: { id: '00000000-0000-4000-8000-000000000731' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000731',
      animalId: cow.id,
      farmId: farm.id,
      type: AnimalExpenseType.REPRODUCAO,
      description: 'Custos de reprodução — aspiração',
      totalAmount: new Decimal(10000),
      expenseDate: new Date('2026-05-10'),
      splitAmongPartners: true,
      createdById: manager.id,
    },
  });

  for (const [index, partner] of [partnerCasaBranca, partnerDaniella].entries()) {
    await prisma.animalExpenseAllocation.upsert({
      where: { id: `00000000-0000-4000-8000-00000000074${index}` },
      update: {},
      create: {
        id: `00000000-0000-4000-8000-00000000074${index}`,
        expenseId: sharedExpense.id,
        partnerId: partner.id,
        ownershipPercent: new Decimal(50),
        allocatedAmount: new Decimal(5000),
      },
    });
  }

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
