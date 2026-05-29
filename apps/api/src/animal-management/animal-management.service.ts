import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnimalManagementCategory,
  AnimalManagementEventType,
  Prisma,
} from '@prisma/client';
import {
  AnimalManagementMetadataDto,
  AnimalManagementRecordDto,
  getCategoryForEventType,
  isEventTypeValidForCategory,
} from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { AuthUser } from '../common/decorators';
import {
  CreateAnimalManagementRecordDto,
  UpdateAnimalManagementRecordDto,
} from '../common/dto';
import { AnimalOwnershipService } from '../animal-ownership/animal-ownership.service';
import { AnimalFinancesService } from '../animal-finances/animal-finances.service';

type RecordWithRelations = Prisma.AnimalManagementRecordGetPayload<{
  include: {
    relatedAnimal: { select: { id: true; tag: true; name: true; sex: true } };
    expense: { include: { allocations: { include: { partner: true } } } };
  };
}>;

@Injectable()
export class AnimalManagementService {
  constructor(
    private prisma: PrismaService,
    private ownershipService: AnimalOwnershipService,
    private financesService: AnimalFinancesService,
  ) {}

  private readonly recordInclude = {
    relatedAnimal: { select: { id: true, tag: true, name: true, sex: true } },
    expense: { include: { allocations: { include: { partner: true } } } },
  } satisfies Prisma.AnimalManagementRecordInclude;

  private parseMetadata(
    value: Prisma.JsonValue | null | undefined,
  ): AnimalManagementMetadataDto | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as AnimalManagementMetadataDto;
  }

  private toDto(record: RecordWithRelations): AnimalManagementRecordDto {
    const dto: AnimalManagementRecordDto = {
      id: record.id,
      farmId: record.farmId,
      animalId: record.animalId,
      category: record.category as AnimalManagementRecordDto['category'],
      eventType: record.eventType as AnimalManagementRecordDto['eventType'],
      performedAt: record.performedAt.toISOString(),
      notes: record.notes,
      relatedAnimalId: record.relatedAnimalId,
      metadata: this.parseMetadata(record.metadata),
      expenseId: record.expenseId,
      createdById: record.createdById,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
    if (record.relatedAnimal) {
      dto.relatedAnimal = {
        id: record.relatedAnimal.id,
        tag: record.relatedAnimal.tag,
        name: record.relatedAnimal.name,
        sex: record.relatedAnimal.sex as NonNullable<
          AnimalManagementRecordDto['relatedAnimal']
        >['sex'],
      };
    }
    if (record.expense) {
      dto.expense = this.financesService.toExpenseDto(record.expense);
    }
    return dto;
  }

  private async ensureRelatedAnimal(farmId: string, relatedAnimalId: string) {
    const related = await this.prisma.animal.findFirst({
      where: { id: relatedAnimalId, farmId },
    });
    if (!related) {
      throw new BadRequestException('Animal relacionado não encontrado nesta fazenda');
    }
  }

  private validateCategoryEvent(
    category: AnimalManagementCategory,
    eventType: AnimalManagementEventType,
  ) {
    if (
      !isEventTypeValidForCategory(
        category as Parameters<typeof isEventTypeValidForCategory>[0],
        eventType as Parameters<typeof isEventTypeValidForCategory>[1],
      )
    ) {
      throw new BadRequestException('Tipo de evento inválido para a categoria');
    }
  }

  async findAll(farmId: string, animalId: string, category?: string) {
    await this.ownershipService.ensureAnimal(farmId, animalId);
    const records = await this.prisma.animalManagementRecord.findMany({
      where: {
        farmId,
        animalId,
        ...(category
          ? { category: category as AnimalManagementCategory }
          : {}),
      },
      include: this.recordInclude,
      orderBy: { performedAt: 'desc' },
    });
    return records.map((r) => this.toDto(r));
  }

  async findOne(farmId: string, animalId: string, id: string) {
    const record = await this.prisma.animalManagementRecord.findFirst({
      where: { id, farmId, animalId },
      include: this.recordInclude,
    });
    if (!record) throw new NotFoundException('Registro de manejo não encontrado');
    return this.toDto(record);
  }

  async create(
    farmId: string,
    animalId: string,
    dto: CreateAnimalManagementRecordDto,
    user: AuthUser,
  ) {
    await this.ownershipService.ensureAnimal(farmId, animalId);
    const category = dto.category as AnimalManagementCategory;
    const eventType = dto.eventType as AnimalManagementEventType;
    this.validateCategoryEvent(category, eventType);

    if (dto.relatedAnimalId) {
      if (dto.relatedAnimalId === animalId) {
        throw new BadRequestException('Animal relacionado deve ser diferente do animal atual');
      }
      await this.ensureRelatedAnimal(farmId, dto.relatedAnimalId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let expenseId: string | undefined;

      if (dto.expense) {
        const expense = await this.financesService.createExpense(
          farmId,
          animalId,
          dto.expense,
          user,
          tx,
        );
        expenseId = expense.id;
      }

      const record = await tx.animalManagementRecord.create({
        data: {
          farmId,
          animalId,
          category,
          eventType,
          performedAt: new Date(dto.performedAt),
          notes: dto.notes,
          relatedAnimalId: dto.relatedAnimalId,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
          expenseId,
          createdById: user.id,
        },
        include: this.recordInclude,
      });

      return record;
    });

    return this.toDto(result);
  }

  async update(
    farmId: string,
    animalId: string,
    id: string,
    dto: UpdateAnimalManagementRecordDto,
  ) {
    const existing = await this.prisma.animalManagementRecord.findFirst({
      where: { id, farmId, animalId },
    });
    if (!existing) throw new NotFoundException('Registro de manejo não encontrado');

    const category = (dto.category ?? existing.category) as AnimalManagementCategory;
    const eventType = (dto.eventType ?? existing.eventType) as AnimalManagementEventType;
    this.validateCategoryEvent(category, eventType);

    if (dto.category === undefined && dto.eventType !== undefined) {
      const inferred = getCategoryForEventType(
        eventType as Parameters<typeof getCategoryForEventType>[0],
      );
      if (inferred && inferred !== category) {
        throw new BadRequestException('Tipo de evento incompatível com a categoria atual');
      }
    }

    const relatedAnimalId =
      dto.relatedAnimalId === null
        ? null
        : dto.relatedAnimalId !== undefined
          ? dto.relatedAnimalId
          : existing.relatedAnimalId;

    if (relatedAnimalId) {
      if (relatedAnimalId === animalId) {
        throw new BadRequestException('Animal relacionado deve ser diferente do animal atual');
      }
      await this.ensureRelatedAnimal(farmId, relatedAnimalId);
    }

    const record = await this.prisma.animalManagementRecord.update({
      where: { id },
      data: {
        category: dto.category as AnimalManagementCategory | undefined,
        eventType: dto.eventType as AnimalManagementEventType | undefined,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        notes: dto.notes === null ? null : dto.notes,
        relatedAnimalId,
        metadata:
          dto.metadata === null
            ? Prisma.JsonNull
            : dto.metadata
              ? (dto.metadata as Prisma.InputJsonValue)
              : undefined,
      },
      include: this.recordInclude,
    });

    return this.toDto(record);
  }

  async remove(farmId: string, animalId: string, id: string) {
    const existing = await this.prisma.animalManagementRecord.findFirst({
      where: { id, farmId, animalId },
    });
    if (!existing) throw new NotFoundException('Registro de manejo não encontrado');
    await this.prisma.animalManagementRecord.delete({ where: { id } });
    return { ok: true };
  }
}
