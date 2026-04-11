import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpsertTeachingServiceCommitteeDto } from './dto/upsert-teaching-service-committee.dto';

type TeachingServiceCommitteeRecord = Prisma.TeachingServiceCommitteeGetPayload<{
  include: { institution: { select: { id: true; name: true } } };
}>;

@Injectable()
export class TeachingServiceCommitteesService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'teaching-service-committees');
  private readonly allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx']);

  constructor(private readonly prisma: PrismaService) {}

  async getMatrix(user: AuthenticatedUser, year = new Date().getFullYear()) {
    const normalizedYear = this.normalizeYear(year);
    const institutions = await this.prisma.institution.findMany({
      where: {
        deletedAt: null,
        ...(user.role === UserRole.INSTITUCION ? { id: this.requireInstitutionId(user) } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const records = await this.prisma.teachingServiceCommittee.findMany({
      where: {
        deletedAt: null,
        year: normalizedYear,
        institutionId: { in: institutions.map((institution) => institution.id) },
      },
      include: {
        institution: { select: { id: true, name: true } },
      },
      orderBy: [{ institution: { name: 'asc' } }, { committeeNumber: 'asc' }],
    });

    const recordMap = new Map(records.map((record) => [this.buildKey(record.institutionId, record.year, record.committeeNumber), record]));

    return {
      year: normalizedYear,
      institutions: institutions.map((institution) => ({
        institutionId: institution.id,
        institutionName: institution.name,
        committees: [1, 2, 3, 4].map((committeeNumber) => {
          const record = recordMap.get(this.buildKey(institution.id, normalizedYear, committeeNumber));
          return this.toCellResponse(record, institution.id, institution.name, normalizedYear, committeeNumber);
        }),
      })),
    };
  }

  async upsertCommittee(
    user: AuthenticatedUser,
    year: number,
    institutionId: string,
    committeeNumber: number,
    dto: UpsertTeachingServiceCommitteeDto,
  ) {
    this.ensureHospitalRole(user);
    this.ensureCommitteeNumber(committeeNumber);

    const normalizedYear = this.normalizeYear(year);
    await this.ensureInstitutionExists(institutionId);

    const record = await this.prisma.teachingServiceCommittee.upsert({
      where: {
        institutionId_year_committeeNumber: {
          institutionId,
          year: normalizedYear,
          committeeNumber,
        },
      },
      update: {
        date: dto.date ? new Date(dto.date) : null,
        time: this.normalizeString(dto.time),
        extraField: this.normalizeString(dto.extraField),
        deletedAt: null,
      },
      create: {
        institutionId,
        year: normalizedYear,
        committeeNumber,
        date: dto.date ? new Date(dto.date) : null,
        time: this.normalizeString(dto.time),
        extraField: this.normalizeString(dto.extraField),
      },
      include: {
        institution: { select: { id: true, name: true } },
      },
    });

    return this.toCellResponse(record, institutionId, record.institution.name, normalizedYear, committeeNumber);
  }

  async uploadFile(user: AuthenticatedUser, year: number, institutionId: string, committeeNumber: number, file?: Express.Multer.File) {
    this.ensureHospitalRole(user);
    this.ensureCommitteeNumber(committeeNumber);

    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo para el comité.');
    }

    const normalizedYear = this.normalizeYear(year);
    await this.ensureInstitutionExists(institutionId);
    this.ensureAllowedFile(file);
    const savedFile = await this.saveFile(file);

    const record = await this.prisma.teachingServiceCommittee.upsert({
      where: {
        institutionId_year_committeeNumber: {
          institutionId,
          year: normalizedYear,
          committeeNumber,
        },
      },
      update: {
        fileUrl: savedFile.fileUrl,
        originalFileName: savedFile.originalFileName,
        deletedAt: null,
      },
      create: {
        institutionId,
        year: normalizedYear,
        committeeNumber,
        fileUrl: savedFile.fileUrl,
        originalFileName: savedFile.originalFileName,
      },
      include: {
        institution: { select: { id: true, name: true } },
      },
    });

    return this.toCellResponse(record, institutionId, record.institution.name, normalizedYear, committeeNumber);
  }

  private ensureHospitalRole(user: AuthenticatedUser) {
    if (user.role !== UserRole.HOSPITAL) {
      throw new ForbiddenException('Solo el hospital puede editar comités docencia-servicio.');
    }
  }

  private requireInstitutionId(user: AuthenticatedUser) {
    if (!user.institutionId) {
      throw new ForbiddenException('El usuario no tiene una institución asociada.');
    }

    return user.institutionId;
  }

  private ensureCommitteeNumber(committeeNumber: number) {
    if (!Number.isInteger(committeeNumber) || committeeNumber < 1 || committeeNumber > 4) {
      throw new BadRequestException('El número de comité debe estar entre 1 y 4.');
    }
  }

  private normalizeYear(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('El año enviado no es válido.');
    }

    return year;
  }

  private async ensureInstitutionExists(institutionId: string) {
    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, deletedAt: null },
      select: { id: true },
    });

    if (!institution) {
      throw new BadRequestException('La institución seleccionada no existe.');
    }
  }

  private normalizeString(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private ensureAllowedFile(file: Express.Multer.File) {
    const extension = extname(file.originalname || '').toLowerCase();
    if (!this.allowedExtensions.has(extension)) {
      throw new BadRequestException('Solo se permiten archivos PDF, Word o Excel para los comités.');
    }
  }

  private async saveFile(file: Express.Multer.File) {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const extension = extname(file.originalname || '').toLowerCase() || '.bin';
    const fileName = `${randomUUID()}${extension}`;
    const absolutePath = join(this.uploadDir, fileName);
    await fs.writeFile(absolutePath, file.buffer);

    return {
      fileUrl: `/uploads/teaching-service-committees/${fileName}`,
      originalFileName: file.originalname,
    };
  }

  private buildKey(institutionId: string, year: number, committeeNumber: number) {
    return `${institutionId}:${year}:${committeeNumber}`;
  }

  private toCellResponse(
    record: TeachingServiceCommitteeRecord | undefined,
    institutionId: string,
    institutionName: string,
    year: number,
    committeeNumber: number,
  ) {
    const hasInfo = !!record?.date || !!record?.time || !!record?.extraField;
    const hasFile = !!record?.fileUrl;
    const completionStatus = hasInfo && hasFile ? 'COMPLETE' : hasInfo || hasFile ? 'PARTIAL' : 'EMPTY';

    return {
      id: record?.id ?? null,
      institutionId,
      institutionName,
      year,
      committeeNumber,
      date: record?.date?.toISOString() ?? null,
      time: record?.time ?? null,
      fileUrl: record?.fileUrl ?? null,
      originalFileName: record?.originalFileName ?? null,
      extraField: record?.extraField ?? null,
      hasInfo,
      hasFile,
      completionStatus,
      updatedAt: record?.updatedAt?.toISOString() ?? null,
    };
  }
}