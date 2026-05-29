import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AnimalSex, AnimalStatus, Prisma } from '@prisma/client';

import {
  type AbczProfilePreviewDto,
  type AnimalDto,
  AnimalSex as SharedAnimalSex,
  AnimalStatus as SharedAnimalStatus,
} from '@controle-fazendas/shared';

import { PrismaService } from '../prisma/prisma.module';

import { CreateAnimalDto, UpdateAnimalDto } from '../common/dto';

import { AbczSyncService } from '../abcz/abcz-sync.service';
import { AnimalOwnershipService } from '../animal-ownership/animal-ownership.service';
import { PartnersService } from '../partners/partners.service';
import { decimalToNumber } from '../common/decimal.util';



type AnimalWithSnapshot = Prisma.AnimalGetPayload<{
  include: {
    abczSnapshot: { select: { id: true } };
    sire: { select: { id: true; tag: true; name: true } };
    dam: { select: { id: true; tag: true; name: true } };
    ownership: { include: { partner: true } };
  };
}>;



@Injectable()

export class AnimalsService {

  private readonly logger = new Logger(AnimalsService.name);



  constructor(

    private prisma: PrismaService,

    private abczSync: AbczSyncService,

    private ownershipService: AnimalOwnershipService,

    private partnersService: PartnersService,

  ) {}



  private readonly animalInclude = {
    abczSnapshot: { select: { id: true } },
    sire: { select: { id: true, tag: true, name: true } },
    dam: { select: { id: true, tag: true, name: true } },
    ownership: {
      include: { partner: true },
      orderBy: [{ isPrimary: 'desc' as const }, { ownershipPercent: 'desc' as const }],
    },
  } satisfies Prisma.AnimalInclude;



  private toDto(animal: AnimalWithSnapshot): AnimalDto {

    return {

      id: animal.id,

      farmId: animal.farmId,

      tag: animal.tag,

      name: animal.name,

      breed: animal.breed,

      pelagem: animal.pelagem,

      sex: animal.sex as SharedAnimalSex,

      birthDate: animal.birthDate?.toISOString() ?? null,

      status: animal.status as SharedAnimalStatus,

      notes: animal.notes,

      abczAnimalId: animal.abczAnimalId,

      abczSerie: animal.abczSerie,

      abczRgn: animal.abczRgn,

      abczRgd: animal.abczRgd,

      abczBreedCode: animal.abczBreedCode,

      abczCategoryCode: animal.abczCategoryCode,

      abczSyncedAt: animal.abczSyncedAt?.toISOString() ?? null,

      abczSourceUrl: animal.abczSourceUrl,

      abczOwnerId: animal.abczOwnerId,

      hasAbczProfile: Boolean(animal.abczSnapshot),
      sireId: animal.sireId,
      damId: animal.damId,
      sire: animal.sire
        ? { id: animal.sire.id, tag: animal.sire.tag, name: animal.sire.name }
        : undefined,
      dam: animal.dam
        ? { id: animal.dam.id, tag: animal.dam.tag, name: animal.dam.name }
        : undefined,
      ownership: animal.ownership?.map((record) => ({
        id: record.id,
        animalId: record.animalId,
        partnerId: record.partnerId,
        ownershipPercent: decimalToNumber(record.ownershipPercent) ?? 0,
        isPrimary: record.isPrimary,
        partner: this.partnersService.toDto(record.partner),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })),

      createdAt: animal.createdAt.toISOString(),

      updatedAt: animal.updatedAt.toISOString(),

    };

  }



  async findAll(farmId: string) {

    const animals = await this.prisma.animal.findMany({

      where: { farmId },

      orderBy: { tag: 'asc' },

      include: this.animalInclude,

    });

    return animals.map((animal) => this.toDto(animal));

  }



  async findOne(farmId: string, id: string) {

    const animal = await this.prisma.animal.findFirst({

      where: { id, farmId },

      include: this.animalInclude,

    });

    if (!animal) throw new NotFoundException('Animal não encontrado');

    return this.toDto(animal);

  }



  private async validateParentLinks(
    farmId: string,
    options: {
      animalId?: string;
      sireId?: string | null;
      damId?: string | null;
    },
  ) {
    const { animalId, sireId, damId } = options;
    if (sireId && damId && sireId === damId) {
      throw new BadRequestException('Pai e mãe não podem ser o mesmo animal');
    }
    if (animalId && (sireId === animalId || damId === animalId)) {
      throw new BadRequestException('O animal não pode ser pai ou mãe de si mesmo');
    }

    const parentIds = [sireId, damId].filter((id): id is string => Boolean(id));
    if (parentIds.length === 0) return;

    const parents = await this.prisma.animal.findMany({
      where: { id: { in: parentIds }, farmId },
    });
    if (parents.length !== parentIds.length) {
      throw new BadRequestException('Pai ou mãe devem pertencer à mesma fazenda');
    }

    for (const parent of parents) {
      if (sireId === parent.id && parent.sex !== AnimalSex.MACHO) {
        throw new BadRequestException('O pai deve ser um animal do sexo macho');
      }
      if (damId === parent.id && parent.sex !== AnimalSex.FEMEA) {
        throw new BadRequestException('A mãe deve ser um animal do sexo fêmea');
      }
      if (
        animalId &&
        (parent.sireId === animalId || parent.damId === animalId)
      ) {
        throw new BadRequestException('Vínculo circular: o ancestral já é descendente deste animal');
      }
    }
  }

  private parentData(dto: CreateAnimalDto | UpdateAnimalDto) {
    const data: { sireId?: string | null; damId?: string | null } = {};
    if ('sireId' in dto && dto.sireId !== undefined) data.sireId = dto.sireId;
    if ('damId' in dto && dto.damId !== undefined) data.damId = dto.damId;
    return data;
  }

  private abczData(dto: CreateAnimalDto | UpdateAnimalDto) {
    return {

      abczAnimalId: dto.abczAnimalId,

      abczSerie: dto.abczSerie,

      abczRgn: dto.abczRgn,

      abczRgd: dto.abczRgd,

      abczBreedCode: dto.abczBreedCode,

      abczCategoryCode: dto.abczCategoryCode,

      abczSourceUrl: dto.abczSourceUrl,

      abczOwnerId: dto.abczOwnerId,

    };

  }



  private async syncAbczAfterCreate(animalId: string, dto: CreateAnimalDto): Promise<void> {
    const snapshot = dto.abczProfileSnapshot as AbczProfilePreviewDto | undefined;

    if (snapshot) {
      await this.abczSync.saveProfileSnapshot(animalId, snapshot, dto.abczSourceUrl);
      return;
    }

    if (
      !dto.abczAnimalId ||
      !dto.abczOwnerId ||
      dto.abczBreedCode == null ||
      dto.abczCategoryCode == null ||
      !dto.abczSerie ||
      !dto.abczRgn
    ) {
      return;
    }

    await this.abczSync.syncForAnimal(animalId, {
      abczAnimalId: dto.abczAnimalId,
      breedCode: dto.abczBreedCode,
      categoryCode: dto.abczCategoryCode,
      sex: dto.sex as AnimalSex,
      serie: dto.abczSerie,
      rgn: dto.abczRgn,
      rgd: dto.abczRgd ?? dto.abczSerie,
      ownerId: dto.abczOwnerId,
      allowsDetail: true,
      sourceUrl: dto.abczSourceUrl,
    });
  }

  async syncAbczFromRemote(farmId: string, id: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id, farmId },
    });
    if (!animal) throw new NotFoundException('Animal não encontrado');

    if (
      !animal.abczAnimalId ||
      !animal.abczOwnerId ||
      animal.abczBreedCode == null ||
      animal.abczCategoryCode == null ||
      !animal.abczSerie ||
      !animal.abczRgn
    ) {
      throw new ConflictException(
        'Animal sem vínculo ABCZ completo. Cadastre série, RGN e dados da consulta antes de sincronizar.',
      );
    }

    await this.abczSync.syncForAnimal(animal.id, {
      abczAnimalId: animal.abczAnimalId,
      breedCode: animal.abczBreedCode,
      categoryCode: animal.abczCategoryCode,
      sex: animal.sex,
      serie: animal.abczSerie,
      rgn: animal.abczRgn,
      rgd: animal.abczRgd ?? animal.abczSerie,
      ownerId: animal.abczOwnerId,
      allowsDetail: true,
      sourceUrl: animal.abczSourceUrl ?? undefined,
    });

    return this.findOne(farmId, id);
  }



  async create(farmId: string, dto: CreateAnimalDto) {
    await this.validateParentLinks(farmId, {
      sireId: dto.sireId,
      damId: dto.damId,
    });

    try {
      const animal = await this.prisma.animal.create({
        data: {
          farmId,
          tag: dto.tag,
          name: dto.name,
          breed: dto.breed,
          pelagem: dto.pelagem,
          sex: dto.sex as AnimalSex,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          status: (dto.status as AnimalStatus) ?? AnimalStatus.ATIVO,
          notes: dto.notes,
          ...this.abczData(dto),
          ...this.parentData(dto),
        },

        include: this.animalInclude,

      });



      try {
        await this.syncAbczAfterCreate(animal.id, dto);
      } catch (error) {
        this.logger.error(`Falha ao gravar perfil ABCZ do animal ${animal.id}`, error);
      }

      await this.ownershipService.initializeDefault(animal.id, farmId);

      const refreshed = await this.prisma.animal.findUniqueOrThrow({

        where: { id: animal.id },

        include: this.animalInclude,

      });

      return this.toDto(refreshed);

    } catch (e) {

      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {

        throw new ConflictException('Já existe um animal com esta identificação nesta fazenda');

      }

      throw e;

    }

  }



  async update(farmId: string, id: string, dto: UpdateAnimalDto) {
    await this.findOne(farmId, id);
    if (dto.sireId !== undefined || dto.damId !== undefined) {
      await this.validateParentLinks(farmId, {
        animalId: id,
        sireId: dto.sireId,
        damId: dto.damId,
      });
    }

    try {
      const animal = await this.prisma.animal.update({
        where: { id },
        data: {
          tag: dto.tag,
          name: dto.name,
          breed: dto.breed,
          pelagem: dto.pelagem,
          sex: dto.sex as AnimalSex | undefined,
          birthDate:
            dto.birthDate !== undefined
              ? dto.birthDate
                ? new Date(dto.birthDate)
                : null
              : undefined,
          status: dto.status as AnimalStatus | undefined,
          notes: dto.notes,
          ...(dto.abczAnimalId !== undefined ||
          dto.abczSerie !== undefined ||
          dto.abczRgn !== undefined ||
          dto.abczRgd !== undefined ||
          dto.abczBreedCode !== undefined ||
          dto.abczCategoryCode !== undefined ||
          dto.abczOwnerId !== undefined ||
          dto.abczSourceUrl !== undefined
            ? this.abczData(dto)
            : {}),
          ...this.parentData(dto),
        },

        include: this.animalInclude,

      });

      try {
        await this.syncAbczAfterCreate(animal.id, {
          ...dto,
          sex: (dto.sex ?? animal.sex) as SharedAnimalSex,
          tag: dto.tag ?? animal.tag,
        } as CreateAnimalDto);
      } catch (error) {
        this.logger.error(`Falha ao gravar perfil ABCZ do animal ${animal.id}`, error);
      }

      const refreshed = await this.prisma.animal.findUniqueOrThrow({
        where: { id: animal.id },
        include: this.animalInclude,
      });

      return this.toDto(refreshed);

    } catch (e) {

      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {

        throw new ConflictException('Já existe um animal com esta identificação nesta fazenda');

      }

      throw e;

    }

  }



  async remove(farmId: string, id: string) {

    await this.findOne(farmId, id);

    return this.prisma.animal.delete({ where: { id } });

  }



  getAbczProfile(farmId: string, animalId: string) {

    return this.abczSync.getProfile(farmId, animalId);

  }

}


