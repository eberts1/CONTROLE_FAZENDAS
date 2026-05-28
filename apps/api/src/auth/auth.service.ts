import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.module';
import { LoginDto } from '../common/dto';

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
