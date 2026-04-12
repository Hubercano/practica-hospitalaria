import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CounterpartStatus, Prisma, UserRole } from '@prisma/client';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateCounterpartRequestDto } from './dto/create-counterpart-request.dto';
import { ApproveCounterpartRequestDto } from './dto/approve-counterpart-request.dto';

@Injectable()
export class CounterpartRequestsService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'counterpart-requests');

  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateCounterpartRequestDto, file?: Express.Multer.File) {
    if (user.role !== UserRole.HOSPITAL) {
      throw new ForbiddenException('Solo el hospital puede crear contraprestaciones.');
    }

    if (!file) {
      throw new BadRequestException('Debe adjuntar el archivo xlsx de la contraprestación.');
    }

    this.ensureXlsxFile(file);

    const institution = await this.prisma.institution.findFirst({
      where: { id: dto.institutionId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!institution) {
      throw new BadRequestException('La institución seleccionada no existe.');
    }

    const savedFile = await this.saveFile(file);

    const counterpart = await this.prisma.counterpartRequest.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        institutionId: institution.id,
        fileUrl: savedFile.fileUrl,
        originalFileName: savedFile.originalFileName,
        createdByUserId: user.id,
        hospitalSeenAt: new Date(),
        institutionSeenAt: null,
      },
      include: this.defaultInclude,
    });

    return this.toResponse(counterpart);
  }

  async findAll(user: AuthenticatedUser, markAsSeen = true) {
    const where = this.buildScope(user);

    const items = await this.prisma.counterpartRequest.findMany({
      where,
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
    });

    if (markAsSeen) {
      await this.markListAsSeen(user);
    }

    return items.map((item) => this.toResponse(item));
  }

  async approve(user: AuthenticatedUser, requestId: string, dto: ApproveCounterpartRequestDto) {
    const request = await this.getRequestForUser(requestId, user);

    if (user.role !== UserRole.INSTITUCION) {
      throw new ForbiddenException('Solo una institución puede aprobar contraprestaciones.');
    }

    if (request.status !== CounterpartStatus.PENDING) {
      throw new BadRequestException('Solo se pueden aprobar solicitudes pendientes.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.counterpartRequest.update({
        where: { id: request.id },
        data: {
          status: CounterpartStatus.APPROVED,
          respondedAt: new Date(),
          respondedByUserId: user.id,
          hospitalSeenAt: null,
          institutionSeenAt: new Date(),
        },
        include: this.defaultInclude,
      });

      await tx.counterpartResponse.upsert({
        where: { counterpartRequestId: request.id },
        update: {
          status: CounterpartStatus.APPROVED,
          valueWithoutDiscount: dto.valueWithoutDiscount,
          discountPercentage: dto.discountPercentage,
          valueWithDiscount: dto.valueWithDiscount,
          respondedByUserId: user.id,
          responseDate: new Date(),
        },
        create: {
          counterpartRequestId: request.id,
          status: CounterpartStatus.APPROVED,
          valueWithoutDiscount: dto.valueWithoutDiscount,
          discountPercentage: dto.discountPercentage,
          valueWithDiscount: dto.valueWithDiscount,
          respondedByUserId: user.id,
        },
      });

      return updatedRequest;
    });

    return this.findOneById(updated.id, user);
  }

  async reject(user: AuthenticatedUser, requestId: string) {
    const request = await this.getRequestForUser(requestId, user);

    if (user.role !== UserRole.INSTITUCION) {
      throw new ForbiddenException('Solo una institución puede rechazar contraprestaciones.');
    }

    if (request.status !== CounterpartStatus.PENDING) {
      throw new BadRequestException('Solo se pueden rechazar solicitudes pendientes.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.counterpartRequest.update({
        where: { id: request.id },
        data: {
          status: CounterpartStatus.REJECTED,
          respondedAt: new Date(),
          respondedByUserId: user.id,
          hospitalSeenAt: null,
          institutionSeenAt: new Date(),
        },
      });

      await tx.counterpartResponse.upsert({
        where: { counterpartRequestId: request.id },
        update: {
          status: CounterpartStatus.REJECTED,
          valueWithoutDiscount: null,
          discountPercentage: null,
          valueWithDiscount: null,
          respondedByUserId: user.id,
          responseDate: new Date(),
        },
        create: {
          counterpartRequestId: request.id,
          status: CounterpartStatus.REJECTED,
          respondedByUserId: user.id,
        },
      });
    });

    return this.findOneById(request.id, user);
  }

  async downloadFile(user: AuthenticatedUser, requestId: string) {
    const request = await this.getRequestForUser(requestId, user);
    const absolutePath = join(process.cwd(), request.fileUrl.replace(/^\//, ''));
    return {
      absolutePath,
      originalFileName: request.originalFileName,
    };
  }

  async getNotificationSummary(user: AuthenticatedUser) {
    if (user.role === UserRole.INSTITUCION) {
      const institutionId = this.requireInstitutionId(user);
      const unreadCount = await this.prisma.counterpartRequest.count({
        where: {
          deletedAt: null,
          institutionId,
          status: CounterpartStatus.PENDING,
          institutionSeenAt: null,
        },
      });

      return { unreadCount };
    }

    const unreadCount = await this.prisma.counterpartRequest.count({
      where: {
        deletedAt: null,
        status: { in: [CounterpartStatus.APPROVED, CounterpartStatus.REJECTED] },
        hospitalSeenAt: null,
      },
    });

    return { unreadCount };
  }

  private async findOneById(requestId: string, user: AuthenticatedUser) {
    const request = await this.prisma.counterpartRequest.findFirst({
      where: {
        id: requestId,
        deletedAt: null,
        ...this.buildScope(user),
      },
      include: this.defaultInclude,
    });

    if (!request) {
      throw new NotFoundException('Contraprestación no encontrada.');
    }

    return this.toResponse(request);
  }

  private async getRequestForUser(requestId: string, user: AuthenticatedUser) {
    const request = await this.prisma.counterpartRequest.findFirst({
      where: {
        id: requestId,
        deletedAt: null,
        ...this.buildScope(user),
      },
      include: this.defaultInclude,
    });

    if (!request) {
      throw new NotFoundException('Contraprestación no encontrada.');
    }

    return request;
  }

  private buildScope(user: AuthenticatedUser): Prisma.CounterpartRequestWhereInput {
    if (user.role === UserRole.INSTITUCION) {
      return { institutionId: this.requireInstitutionId(user) };
    }

    return {};
  }

  private requireInstitutionId(user: AuthenticatedUser) {
    if (!user.institutionId) {
      throw new ForbiddenException('El usuario no tiene institución asociada.');
    }

    return user.institutionId;
  }

  private async markListAsSeen(user: AuthenticatedUser) {
    if (user.role === UserRole.INSTITUCION) {
      await this.prisma.counterpartRequest.updateMany({
        where: {
          deletedAt: null,
          institutionId: this.requireInstitutionId(user),
          institutionSeenAt: null,
        },
        data: { institutionSeenAt: new Date() },
      });
      return;
    }

    await this.prisma.counterpartRequest.updateMany({
      where: {
        deletedAt: null,
        hospitalSeenAt: null,
      },
      data: { hospitalSeenAt: new Date() },
    });
  }

  private ensureXlsxFile(file: Express.Multer.File) {
    const extension = extname(file.originalname || '').toLowerCase();
    if (extension !== '.xlsx') {
      throw new BadRequestException('Solo se permiten archivos .xlsx para contraprestaciones.');
    }
  }

  private async saveFile(file: Express.Multer.File) {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const fileName = `${randomUUID()}.xlsx`;
    const absolutePath = join(this.uploadDir, fileName);
    await fs.writeFile(absolutePath, file.buffer);

    return {
      fileUrl: `/uploads/counterpart-requests/${fileName}`,
      originalFileName: file.originalname,
    };
  }

  private readonly defaultInclude = {
    institution: {
      select: { id: true, name: true },
    },
    response: true,
  } satisfies Prisma.CounterpartRequestInclude;

  private toResponse(request: any) {
    const response = request.response ?? null;

    return {
      id: request.id,
      name: request.name,
      description: request.description,
      status: request.status,
      institutionId: request.institutionId,
      institution: request.institution,
      fileUrl: request.fileUrl,
      originalFileName: request.originalFileName,
      createdAt: request.createdAt,
      respondedAt: request.respondedAt,
      values: response
        ? {
            valueWithoutDiscount: response.valueWithoutDiscount,
            discountPercentage: response.discountPercentage,
            valueWithDiscount: response.valueWithDiscount,
            responseDate: response.responseDate,
          }
        : null,
    };
  }
}