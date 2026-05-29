import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { FarmRole, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { LoginDto, RegisterDto } from '../common/dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        farms: {
          include: { farm: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const farms =
      user.role === 'ADMIN'
        ? await this.prisma.farm.findMany({ orderBy: { name: 'asc' } })
        : user.farms.map((f) => f.farm);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      farms: farms.map((f) => this.formatFarm(f)),
    };
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const { user, farm } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          password: passwordHash,
          name: dto.name,
          role: Role.MANAGER,
        },
      });

      const createdFarm = await tx.farm.create({
        data: {
          name: dto.farmName,
          location: dto.farmLocation?.trim() || null,
        },
      });

      await tx.farmUser.create({
        data: {
          userId: createdUser.id,
          farmId: createdFarm.id,
          role: FarmRole.OWNER,
        },
      });

      return { user: createdUser, farm: createdFarm };
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      farms: [this.formatFarm(farm)],
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      return this.generateTokens(payload.sub, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        farms: { include: { farm: true } },
      },
    });

    if (!user) throw new UnauthorizedException();

    const farms =
      user.role === 'ADMIN'
        ? await this.prisma.farm.findMany({ orderBy: { name: 'asc' } })
        : user.farms.map((f) => f.farm);

    return {
      user: this.sanitizeUser(user),
      farms: farms.map((f) => this.formatFarm(f)),
    };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: { id: string; email: string; name: string; role: string; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private formatFarm(farm: { id: string; name: string; location: string | null; createdAt: Date; updatedAt: Date }) {
    return {
      id: farm.id,
      name: farm.name,
      location: farm.location,
      createdAt: farm.createdAt.toISOString(),
      updatedAt: farm.updatedAt.toISOString(),
    };
  }
}
