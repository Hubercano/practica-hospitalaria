import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    await this.ensureEmailAvailable(email);

    const normalizedInstitutionId = await this.normalizeInstitutionId(dto.role, dto.institutionId);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: dto.role,
        status: dto.status || UserStatus.ACTIVE,
        institutionId: normalizedInstitutionId,
      },
      include: {
        institution: {
          select: { id: true, name: true },
        },
      },
    });

    return this.toResponse(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        institution: {
          select: { id: true, name: true },
        },
      },
      orderBy: { email: 'asc' },
    });

    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        institution: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const email = dto.email?.trim().toLowerCase();
    if (email && email !== existingUser.email) {
      await this.ensureEmailAvailable(email);
    }

    const role = dto.role || existingUser.role;
    const institutionId = await this.normalizeInstitutionId(role, dto.institutionId ?? existingUser.institutionId ?? undefined);

    const data: {
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      institutionId?: string | null;
      passwordHash?: string;
      passwordChangedAt?: Date;
      failedLoginAttempts?: number;
      lockedUntil?: null;
    } = {
      ...(email ? { email } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      institutionId,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      data.passwordChangedAt = new Date();
      data.failedLoginAttempts = 0;
      data.lockedUntil = null;
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data,
        include: {
          institution: {
            select: { id: true, name: true },
          },
        },
      });

      if (dto.password) {
        await tx.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return updated;
    });

    return this.toResponse(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, currentUserId: string) {
    if (id === currentUserId && dto.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('No puede desactivar o bloquear su propio usuario.');
    }

    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        failedLoginAttempts: dto.status === UserStatus.ACTIVE ? 0 : user.failedLoginAttempts,
        lockedUntil: dto.status === UserStatus.ACTIVE ? null : user.lockedUntil,
      },
      include: {
        institution: {
          select: { id: true, name: true },
        },
      },
    });

    if (dto.status !== UserStatus.ACTIVE) {
      await this.prisma.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return this.toResponse(updated);
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Use el cambio de contraseña personal para su propia cuenta.');
    }

    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          passwordHash: await bcrypt.hash(dto.newPassword, 12),
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        include: {
          institution: {
            select: { id: true, name: true },
          },
        },
      });

      await tx.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return result;
    });

    return this.toResponse(updated);
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }
  }

  private async normalizeInstitutionId(role: UserRole, institutionId?: string) {
    if (role === UserRole.HOSPITAL) {
      return null;
    }

    if (!institutionId) {
      throw new BadRequestException('Los usuarios de institución requieren una institución asociada.');
    }

    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, deletedAt: null },
      select: { id: true },
    });

    if (!institution) {
      throw new BadRequestException('La institución seleccionada no existe.');
    }

    return institution.id;
  }

  private toResponse(user: {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    institutionId: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    institution?: { id: string; name: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      institutionId: user.institutionId,
      institution: user.institution || null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}