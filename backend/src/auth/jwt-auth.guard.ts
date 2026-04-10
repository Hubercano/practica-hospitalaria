import { CanActivate, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AccessTokenPayload } from './interfaces/access-token-payload.interface';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: import('@nestjs/common').ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: AuthenticatedUser }>();
    const authHeader = request.headers.authorization;

    if (!authHeader || Array.isArray(authHeader)) {
      throw new UnauthorizedException('Debe iniciar sesión para continuar.');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de autenticación inválido.');
    }

    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'dev-auth-secret-change-me',
    });

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        institutionId: true,
        passwordChangedAt: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Sesión inválida o usuario inactivo.');
    }

    if (user.passwordChangedAt && payload.iat) {
      const issuedAtMs = payload.iat * 1000;
      if (user.passwordChangedAt.getTime() > issuedAtMs) {
        throw new UnauthorizedException('La sesión ya no es válida. Inicie sesión nuevamente.');
      }
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      institutionId: user.institutionId,
      sessionId: payload.sessionId,
    };

    return true;
  }
}