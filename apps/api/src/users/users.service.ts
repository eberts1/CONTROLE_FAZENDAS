import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { AdminCreateUserDto, BlockUserDto } from '../common/dto';
import type { AuthUser } from '../common/decorators';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  blocked: true,
  blockedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: userSelect,
      orderBy: { name: 'asc' },
    });
    return users.map((user) => this.formatUser(user));
  }

  async create(dto: AdminCreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        name: dto.name,
        role: dto.role ?? Role.MANAGER,
      },
      select: userSelect,
    });

    return this.formatUser(user);
  }

  async setBlocked(id: string, dto: BlockUserDto, actor: AuthUser) {
    if (actor.id === id && dto.blocked) {
      throw new BadRequestException('Você não pode bloquear a própria conta');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role === Role.ADMIN && dto.blocked) {
      throw new ForbiddenException('Não é possível bloquear um administrador');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        blocked: dto.blocked,
        blockedAt: dto.blocked ? new Date() : null,
      },
      select: userSelect,
    });

    return this.formatUser(updated);
  }

  async resetPassword(id: string, actor: AuthUser) {
    if (actor.id === id) {
      throw new BadRequestException('Use alteração de senha para a própria conta');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });

    return { temporaryPassword };
  }

  private generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(12);
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars[bytes[i]! % chars.length];
    }
    return password;
  }

  private formatUser(user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    blocked: boolean;
    blockedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      blocked: user.blocked,
      blockedAt: user.blockedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
