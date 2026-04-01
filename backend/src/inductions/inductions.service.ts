import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { CreateInductionDto } from './dto/create-induction.dto';
import { UpdateInductionDto } from './dto/update-induction.dto';

type ValidityCode = 'THREE_MONTHS' | 'SIX_MONTHS' | 'ONE_YEAR' | 'ONE_YEAR_SIX_MONTHS' | 'TWO_YEARS';

@Injectable()
export class InductionsService {
  constructor(private prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any;
  }

  private readonly validityOptions: Record<ValidityCode, { label: string; months: number }> = {
    THREE_MONTHS: { label: '3 meses', months: 3 },
    SIX_MONTHS: { label: '6 meses', months: 6 },
    ONE_YEAR: { label: '1 año', months: 12 },
    ONE_YEAR_SIX_MONTHS: { label: '1 año y 6 meses', months: 18 },
    TWO_YEARS: { label: '2 años', months: 24 },
  };

  private now(): Date {
    return new Date();
  }

  private normalizeDocument(document: string): string {
    return String(document || '').replace(/\D/g, '').trim();
  }

  private addMonths(baseDate: Date, months: number): Date {
    const result = new Date(baseDate);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private resolveValidity(validityCode: string | undefined) {
    const validity = this.validityOptions[(validityCode || 'ONE_YEAR') as ValidityCode];
    if (!validity) {
      throw new BadRequestException('La vigencia seleccionada no es valida.');
    }
    return validity;
  }

  private getPublicBaseUrl(): string {
    const appUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:4200').replace(/\/$/, '');
    return `${appUrl}/public/inductions/access`;
  }

  private async ensurePublicSlug(inductionId: string, currentSlug?: string | null): Promise<string> {
    if (currentSlug) {
      return currentSlug;
    }

    const generatedSlug = randomBytes(16).toString('hex');
    await this.db.induction.update({
      where: { id: inductionId },
      data: {
        publicSlug: generatedSlug,
        linkMode: 'PERMANENT',
      },
    });
    return generatedSlug;
  }

  private async serializeInduction(induction: any, includeStudents = false) {
    const publicSlug = await this.ensurePublicSlug(induction.id, induction.publicSlug);
    const validity = this.resolveValidity(induction.validityCode);

    const serialized: any = {
      id: induction.id,
      name: induction.name,
      status: induction.status,
      inductionDate: induction.startAt,
      expiryDate: induction.endAt,
      validityCode: induction.validityCode,
      validityLabel: validity.label,
      validityMonths: induction.validityMonths,
      studentCount: induction._count?.allowedStudents ?? induction.allowedStudents?.length ?? 0,
      publicSlug,
      publicUrl: `${this.getPublicBaseUrl()}/${publicSlug}`,
      createdAt: induction.createdAt,
    };

    if (includeStudents) {
      serialized.students = (induction.allowedStudents || []).map((allowed: any) => ({
        id: allowed.id,
        document: allowed.document,
        source: allowed.source,
        studentId: allowed.studentId,
        student: allowed.student
          ? {
              id: allowed.student.id,
              firstName: allowed.student.firstName,
              lastName: allowed.student.lastName,
              email: allowed.student.email,
              document: allowed.student.document,
            }
          : null,
      }));
    }

    return serialized;
  }

  private async resolveStudentsForAssociation(studentIds: string[]) {
    const uniqueIds = Array.from(new Set((studentIds || []).filter(Boolean)));
    if (!uniqueIds.length) {
      throw new BadRequestException('Debes seleccionar al menos un estudiante.');
    }

    const students = await this.db.student.findMany({
      where: {
        id: { in: uniqueIds },
        deletedAt: null,
      },
      select: {
        id: true,
        document: true,
      },
    });

    if (students.length !== uniqueIds.length) {
      throw new BadRequestException('Uno o mas estudiantes seleccionados no existen.');
    }

    return students;
  }

  async create(dto: CreateInductionDto) {
    const inductionDate = new Date(dto.inductionDate);
    const validity = this.resolveValidity(dto.validityCode);
    const expiryDate = this.addMonths(inductionDate, validity.months);
    const students = await this.resolveStudentsForAssociation(dto.studentIds);
    const publicSlug = randomBytes(16).toString('hex');

    const induction = await this.db.induction.create({
      data: {
        name: dto.name,
        status: 'ACTIVE',
        startAt: inductionDate,
        endAt: expiryDate,
        validityCode: dto.validityCode,
        validityMonths: validity.months,
        expiryPolicy: 'FIXED_END_DATE',
        expiryDays: null,
        linkMode: 'PERMANENT',
        publicSlug,
        allowedStudents: {
          create: students.map((student: { id: string; document: string }) => ({
            studentId: student.id,
            document: student.document,
            source: 'MANUAL',
          })),
        },
      },
      include: {
        _count: {
          select: {
            allowedStudents: true,
          },
        },
      },
    });

    await this.db.inductionAuditEvent.create({
      data: {
        inductionId: induction.id,
        eventType: 'INDUCTION_CREATED',
        details: {
          name: induction.name,
          inductionDate,
          expiryDate,
          validityCode: dto.validityCode,
          students: students.length,
        },
      },
    });

    return this.serializeInduction(induction);
  }

  async findAll() {
    const inductions = await this.db.induction.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            allowedStudents: true,
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    return Promise.all(inductions.map((induction: any) => this.serializeInduction(induction)));
  }

  async findOne(id: string) {
    const induction = await this.db.induction.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            allowedStudents: true,
            attendances: true,
          },
        },
        allowedStudents: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                document: true,
              },
            },
          },
          orderBy: { document: 'asc' },
        },
      },
    });

    if (!induction) {
      throw new NotFoundException('Induccion no encontrada.');
    }

    return this.serializeInduction(induction, true);
  }

  async update(id: string, dto: UpdateInductionDto) {
    const current = await this.findOne(id);
    const inductionDate = new Date(dto.inductionDate || current.inductionDate);
    const validity = this.resolveValidity(dto.validityCode || current.validityCode);
    const expiryDate = this.addMonths(inductionDate, validity.months);
    const students = dto.studentIds ? await this.resolveStudentsForAssociation(dto.studentIds) : null;

    await this.db.induction.update({
      where: { id },
      data: {
        name: dto.name,
        startAt: inductionDate,
        endAt: expiryDate,
        validityCode: dto.validityCode || current.validityCode,
        validityMonths: validity.months,
        linkMode: 'PERMANENT',
        ...(students
          ? {
              allowedStudents: {
                deleteMany: {},
                create: students.map((student: { id: string; document: string }) => ({
                  studentId: student.id,
                  document: student.document,
                  source: 'MANUAL',
                })),
              },
            }
          : {}),
      },
    });

    await this.db.inductionAuditEvent.create({
      data: {
        inductionId: id,
        eventType: 'INDUCTION_UPDATED',
        details: dto,
      },
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.db.induction.update({
      where: { id },
      data: { deletedAt: this.now(), status: 'CANCELLED' },
    });
  }

  async getPermanentLink(inductionId: string) {
    const induction = await this.findOne(inductionId);
    return {
      publicSlug: induction.publicSlug,
      url: induction.publicUrl,
    };
  }

  async bulkAddAllowedStudents(inductionId: string, documents: string[]) {
    await this.findOne(inductionId);

    const normalized = Array.from(new Set(documents.map((doc) => this.normalizeDocument(doc)).filter(Boolean)));
    if (!normalized.length) {
      throw new BadRequestException('No se enviaron documentos validos.');
    }

    const students: Array<{ id: string; document: string }> = await this.db.student.findMany({
      where: { document: { in: normalized }, deletedAt: null },
      select: { id: true, document: true },
    });

    const studentByDocument = new Map(students.map((student) => [student.document, student.id]));
    const data = normalized.map((document) => ({
      inductionId,
      document,
      studentId: studentByDocument.get(document) || null,
      source: 'BULK_UPLOAD',
    }));

    const result = await this.db.inductionAllowedStudent.createMany({
      data,
      skipDuplicates: true,
    });

    return {
      requested: normalized.length,
      created: result.count,
      matchedStudents: students.length,
      unmatchedDocuments: normalized.filter((document) => !studentByDocument.has(document)),
    };
  }

  async listAllowedStudents(inductionId: string) {
    await this.findOne(inductionId);

    return this.db.inductionAllowedStudent.findMany({
      where: { inductionId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            document: true,
          },
        },
      },
      orderBy: { document: 'asc' },
    });
  }

  async addAllowedStudent(inductionId: string, document: string) {
    await this.findOne(inductionId);

    const normalizedDocument = this.normalizeDocument(document);
    if (!normalizedDocument) {
      throw new BadRequestException('Documento invalido.');
    }

    const student = await this.db.student.findFirst({
      where: { document: normalizedDocument, deletedAt: null },
      select: { id: true },
    });

    if (!student) {
      throw new BadRequestException('La cedula indicada no existe en estudiantes.');
    }

    return this.db.inductionAllowedStudent.upsert({
      where: {
        inductionId_document: {
          inductionId,
          document: normalizedDocument,
        },
      },
      create: {
        inductionId,
        document: normalizedDocument,
        studentId: student.id,
        source: 'MANUAL',
      },
      update: {
        studentId: student.id,
      },
    });
  }

  async removeAllowedStudent(inductionId: string, allowedId: string) {
    await this.findOne(inductionId);

    const existing = await this.db.inductionAllowedStudent.findFirst({
      where: {
        id: allowedId,
        inductionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Estudiante asociado no encontrado para esta induccion.');
    }

    await this.db.inductionAllowedStudent.delete({ where: { id: allowedId } });
    return { success: true };
  }

  async listAttendances(inductionId: string) {
    await this.findOne(inductionId);

    return this.db.inductionAttendance.findMany({
      where: { inductionId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            document: true,
            email: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  private async resolvePublicInduction(publicSlug: string) {
    const induction = await this.db.induction.findFirst({
      where: {
        publicSlug,
        deletedAt: null,
      },
    });

    if (!induction) {
      throw new NotFoundException('Acceso invalido.');
    }

    return induction;
  }

  async publicMetadata(publicSlug: string) {
    const induction = await this.resolvePublicInduction(publicSlug);
    const validity = this.resolveValidity(induction.validityCode);

    return {
      inductionId: induction.id,
      name: induction.name,
      inductionDate: induction.startAt,
      expiryDate: induction.endAt,
      validityLabel: validity.label,
    };
  }

  async publicVerifyDocument(publicSlug: string, document: string) {
    const normalizedDocument = this.normalizeDocument(document);
    if (!normalizedDocument) {
      throw new BadRequestException('Documento invalido.');
    }

    const induction = await this.resolvePublicInduction(publicSlug);
    const student = await this.db.student.findFirst({
      where: { document: normalizedDocument, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, document: true },
    });

    if (!student) {
      throw new NotFoundException('La cedula no existe en el modulo de estudiantes.');
    }

    const allowed = await this.db.inductionAllowedStudent.findFirst({
      where: {
        inductionId: induction.id,
        studentId: student.id,
      },
    });

    if (!allowed) {
      throw new BadRequestException('El estudiante no esta asociado a esta induccion.');
    }

    return {
      inductionId: induction.id,
      student,
      allowed: true,
    };
  }

  async publicAttend(publicSlug: string, document: string, ipAddress?: string, userAgent?: string) {
    const induction = await this.resolvePublicInduction(publicSlug);
    const verified = await this.publicVerifyDocument(publicSlug, document);
    const student = verified.student;

    const completedAt = new Date(induction.startAt);
    const expiresAt = new Date(induction.endAt);

    const attendance = await this.db.inductionAttendance.upsert({
      where: {
        inductionId_studentId: {
          inductionId: induction.id,
          studentId: student.id,
        },
      },
      update: {
        completedAt,
        expiresAt,
        documentSnapshot: student.document,
        channel: 'QR_PUBLIC',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      create: {
        inductionId: induction.id,
        studentId: student.id,
        completedAt,
        expiresAt,
        documentSnapshot: student.document,
        channel: 'QR_PUBLIC',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      message: 'Asistencia registrada correctamente.',
      inductionId: induction.id,
      studentId: student.id,
      completedAt,
      expiresAt,
      attendanceId: attendance.id,
    };
  }
}