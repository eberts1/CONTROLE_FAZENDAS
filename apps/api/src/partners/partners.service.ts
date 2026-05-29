import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PartnerDto } from '@controle-fazendas/shared';
import { PrismaService } from '../prisma/prisma.module';
import { CreatePartnerDto, UpdatePartnerDto } from '../common/dto';

type PartnerRecord = Prisma.PartnerGetPayload<object>;

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  toDto(partner: PartnerRecord): PartnerDto {
    return {
      id: partner.id,
      farmId: partner.farmId,
      name: partner.name,
      document: partner.document,
      email: partner.email,
      phone: partner.phone,
      notes: partner.notes,
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
    };
  }

  async findAll(farmId: string) {
    const partners = await this.prisma.partner.findMany({
      where: { farmId },
      orderBy: { name: 'asc' },
    });
    return partners.map((p) => this.toDto(p));
  }

  async findOne(farmId: string, id: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, farmId },
    });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    return this.toDto(partner);
  }

  async create(farmId: string, dto: CreatePartnerDto) {
    try {
      const partner = await this.prisma.partner.create({
        data: {
          farmId,
          name: dto.name,
          document: dto.document || null,
          email: dto.email || null,
          phone: dto.phone || null,
          notes: dto.notes || null,
        },
      });
      return this.toDto(partner);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um parceiro com este documento nesta fazenda');
      }
      throw e;
    }
  }

  async update(farmId: string, id: string, dto: UpdatePartnerDto) {
    await this.findOne(farmId, id);
    const partner = await this.prisma.partner.update({
      where: { id },
      data: {
        name: dto.name,
        document: dto.document !== undefined ? dto.document || null : undefined,
        email: dto.email !== undefined ? dto.email || null : undefined,
        phone: dto.phone !== undefined ? dto.phone || null : undefined,
        notes: dto.notes !== undefined ? dto.notes || null : undefined,
      },
    });
    return this.toDto(partner);
  }

  async remove(farmId: string, id: string) {
    await this.findOne(farmId, id);

    const linked = await this.prisma.animalOwnership.count({
      where: { partnerId: id },
    });
    if (linked > 0) {
      throw new ConflictException(
        'Parceiro vinculado a cotas de animais. Remova os vínculos antes de excluir.',
      );
    }

    await this.prisma.partner.delete({ where: { id } });
    return { ok: true };
  }

  async findOrCreateDefaultForFarm(farmId: string, farmName: string) {
    let partner = await this.prisma.partner.findFirst({
      where: { farmId, name: farmName },
    });

    if (!partner) {
      partner = await this.prisma.partner.create({
        data: { farmId, name: farmName },
      });
    }

    return partner;
  }
}
