import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AUTH_DEFAULT_ACCESS_TTL,
  AUTH_DEFAULT_LOGIN_LOCK_MS,
  AUTH_DEFAULT_LOGIN_MAX_ATTEMPTS,
  AUTH_DEFAULT_REFRESH_TTL_MS,
} from './auth.constants';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { AccessTokenPayload } from './interfaces/access-token-payload.interface';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

type SafeUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  institutionId: string | null;
  institutionName: string | null;
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.ensureBootstrapHospitalUser();
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string | string[]) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        institution: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('La cuenta está bloqueada temporalmente.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('La cuenta no está habilitada para iniciar sesión.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.registerFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const { accessToken, refreshToken } = await this.issueSession(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        institutionId: user.institutionId,
        institutionName: user.institution?.name || null,
      },
      ipAddress,
      this.stringifyUserAgent(userAgent),
    );

    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        institutionId: user.institutionId,
        institutionName: user.institution?.name || null,
      }),
    };
  }

  async refresh(refreshToken: string | undefined, ipAddress?: string, userAgent?: string | string[]) {
    if (!refreshToken) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    const session = await this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash: this.hashToken(refreshToken),
      },
      include: {
        user: {
          include: {
            institution: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesión expirada o inválida.');
    }

    if (session.user.status !== UserStatus.ACTIVE || session.user.deletedAt) {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }

    const stringUserAgent = this.stringifyUserAgent(userAgent);

    const rotated = await this.prisma.$transaction(async (tx) => {
      await tx.userSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

      return this.issueSession(
        {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          status: session.user.status,
          institutionId: session.user.institutionId,
          institutionName: session.user.institution?.name || null,
        },
        ipAddress,
        stringUserAgent,
        tx,
      );
    });

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      user: this.toSafeUser({
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
        institutionId: session.user.institutionId,
        institutionName: session.user.institution?.name || null,
      }),
    };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return { success: true };
    }

    await this.prisma.userSession.updateMany({
      where: {
        refreshTokenHash: this.hashToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    return { success: true };
  }

  async getProfile(user: AuthenticatedUser) {
    const fullUser = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      include: {
        institution: {
          select: { id: true, name: true },
        },
      },
    });

    if (!fullUser) {
      throw new UnauthorizedException('No se encontró la sesión del usuario.');
    }

    return this.toSafeUser({
      id: fullUser.id,
      email: fullUser.email,
      role: fullUser.role,
      status: fullUser.status,
      institutionId: fullUser.institutionId,
      institutionName: fullUser.institution?.name || null,
    });
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto) {
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
    });

    if (!existingUser) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const currentPasswordMatches = await bcrypt.compare(dto.currentPassword, existingUser.passwordHash);
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await this.hashPassword(dto.newPassword),
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  private async issueSession(
    user: SafeUser,
    ipAddress?: string,
    userAgent?: string,
    tx: Pick<PrismaService, 'userSession'> = this.prisma,
  ) {
    const refreshToken = this.generateToken();
    const session = await tx.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.getRefreshTtlMs()),
        ipAddress,
        userAgent,
      },
    });

    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      institutionId: user.institutionId,
      sessionId: session.id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getJwtSecret(),
      expiresIn: (process.env.AUTH_ACCESS_TOKEN_TTL || AUTH_DEFAULT_ACCESS_TTL) as never,
      issuer: process.env.AUTH_JWT_ISSUER || 'practica-hospitalaria-backend',
      audience: process.env.AUTH_JWT_AUDIENCE || 'practica-hospitalaria-frontend',
    });

    return { accessToken, refreshToken };
  }

  private async ensureBootstrapHospitalUser() {
    const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();

    if (!bootstrapEmail || !bootstrapPassword) {
      return;
    }

    const hospitalUserCount = await this.prisma.user.count({
      where: { role: UserRole.HOSPITAL, deletedAt: null },
    });

    if (hospitalUserCount > 0) {
      return;
    }

    await this.prisma.user.create({
      data: {
        email: bootstrapEmail,
        passwordHash: await this.hashPassword(bootstrapPassword),
        role: UserRole.HOSPITAL,
        status: UserStatus.ACTIVE,
      },
    });
  }

  private async registerFailedLogin(userId: string, failedAttempts: number) {
    const nextAttempts = failedAttempts + 1;
    const shouldLock = nextAttempts >= this.getMaxFailedAttempts();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: shouldLock ? 0 : nextAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + this.getLockDurationMs()) : null,
      },
    });
  }

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateToken() {
    return randomBytes(48).toString('hex');
  }

  private stringifyUserAgent(userAgent?: string | string[]) {
    if (!userAgent) {
      return undefined;
    }

    return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
  }

  private getRefreshTtlMs() {
    return Number(process.env.AUTH_REFRESH_TOKEN_TTL_MS || AUTH_DEFAULT_REFRESH_TTL_MS);
  }

  private getJwtSecret() {
    return process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'dev-auth-secret-change-me';
  }

  private getMaxFailedAttempts() {
    return Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || AUTH_DEFAULT_LOGIN_MAX_ATTEMPTS);
  }

  private getLockDurationMs() {
    return Number(process.env.AUTH_LOGIN_LOCK_MS || AUTH_DEFAULT_LOGIN_LOCK_MS);
  }

  private toSafeUser(user: SafeUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      institutionId: user.institutionId,
      institutionName: user.institutionName,
    };
  }
}