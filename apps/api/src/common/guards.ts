import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { IS_PUBLIC_KEY, ROLES_KEY, AuthUser } from './decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Não autenticado');
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Permissão insuficiente');
    }
    return true;
  }
}

@Injectable()
export class FarmAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const farmId = request.params.farmId;

    if (!farmId) return true;
    if (user.role === Role.ADMIN) return true;

    const membership = await this.prisma.farmUser.findUnique({
      where: { userId_farmId: { userId: user.id, farmId } },
    });

    if (!membership) {
      throw new ForbiddenException('Sem acesso a esta fazenda');
    }

    request.farmMembership = membership;
    return true;
  }
}
