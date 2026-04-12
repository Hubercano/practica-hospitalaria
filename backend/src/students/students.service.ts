import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { EntityState, Prisma, UserRole, ValidationStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  private getRequirementStatus(student: any): string {
    let status = 'COMPLETADO';
    let hasCritical = false;
    let hasExpiringSoon = false;
    let hasPending = false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const criticalThreshold = new Date(now);
    criticalThreshold.setDate(now.getDate() + 5);

    const warningThreshold = new Date(now);
    warningThreshold.setDate(now.getDate() + 30);

    const valuesMap = new Map<string, any>(student.requirements.map((r: any) => [r.definitionId, r]));

    for (const def of student.type.requirements) {
      const val: any = valuesMap.get(def.id);

      if (def.isRequired) {
        if (!val || !val.value || val.status === ValidationStatus.PENDING) {
          hasPending = true;
        }
      }

      if (val && val.expiryDate) {
        const expiry = new Date(val.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        if (expiry <= criticalThreshold) {
          hasCritical = true;
        } else if (expiry <= warningThreshold) {
          hasExpiringSoon = true;
        }
      }
    }

    if (hasCritical) {
      status = 'CRITICO';
    } else if (hasExpiringSoon) {
      status = 'PROXIMO A VENCER';
    } else if (hasPending) {
      status = 'PENDIENTE';
    }

    return status;
  }

  private getInductionSummary(attendances: Array<{ completedAt: Date; expiresAt: Date }>) {
    if (!attendances.length) {
      return {
        inductionStatus: 'NO_REALIZADA',
        inductionCompletedAt: null,
        inductionExpiresAt: null,
      };
    }

    const now = new Date();
    const sorted = [...attendances].sort((a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    const latest = sorted[0];

    const hasValid = attendances.some((a) => new Date(a.expiresAt).getTime() >= now.getTime());

    return {
      inductionStatus: hasValid ? 'VIGENTE' : 'VENCIDA',
      inductionCompletedAt: latest.completedAt,
      inductionExpiresAt: latest.expiresAt,
    };
  }

  async create(data: Prisma.StudentCreateInput, user?: AuthenticatedUser) {
    if (user?.role === UserRole.INSTITUCION) {
      const institutionId = this.requireInstitutionId(user);
      (data as { institution?: { connect?: { id?: string } } }).institution = {
        connect: { id: institutionId },
      };
    }

    // 1. Check if student already exists by document
    const exists = await this.prisma.student.findUnique({
      where: { document: data.document },
    });
    if (exists) {
      throw new ConflictException('Estudiante ya existe con este documento');
    }

    // 2. We need the typeId to get the requirements definitions
    // The data passed usually has the connect syntax for relational fields in Prisma
    const typeId = data.type.connect?.id;
    if (!typeId) {
       throw new ConflictException('Se requiere el ID del tipo de estudiante');
    }

    // 3. Create student
    const student = await this.prisma.student.create({ data });

    // 4. Create requirement placeholders for the newly created student based on their type
    const requirements = await this.prisma.studentRequirementDefinition.findMany({
      where: { studentTypeId: typeId },
    });

    const initData = requirements.map((req) => ({
      studentId: student.id,
      definitionId: req.id,
      status: ValidationStatus.PENDING,
      value: null,
    }));

    if (initData.length > 0) {
      await this.prisma.studentRequirementValue.createMany({
        data: initData,
      });
    }

    return student;
  }

  async findAll(includeInactive = false, user?: AuthenticatedUser) {
    const students = await this.prisma.student.findMany({
      where: {
        deletedAt: null,
        ...this.studentScope(user),
        ...(includeInactive ? {} : { state: EntityState.ACTIVE }),
      },
      include: {
        institution: true,
        type: { include: { requirements: true } },
        requirements: { include: { definition: true } },
        inductionAttendances: {
          select: {
            completedAt: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return students.map((student) => {
      const status = this.getRequirementStatus(student);
      const inductionSummary = this.getInductionSummary(student.inductionAttendances || []);

      return {
        ...student,
        status,
        ...inductionSummary,
      };
    });
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.studentScope(user),
      },
      include: {
        institution: true,
        type: true,
        requirements: { include: { definition: true } },
        inductionAttendances: {
          include: {
            induction: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    await this.documentsService.ensureStudentRequirementSlots(
      student.requirements.map((requirement) => ({
        id: requirement.id,
        studentId: student.id,
        definition: {
          id: requirement.definition.id,
          name: requirement.definition.name,
          description: requirement.definition.description,
          type: requirement.definition.type,
          isRequired: requirement.definition.isRequired,
          requiresExpiryDate: requirement.definition.requiresExpiryDate,
        },
      })),
    );

    const slotMap = await this.documentsService.getStudentRequirementSlotMap(
      student.requirements.map((requirement) => ({
        id: requirement.id,
        studentId: student.id,
        definitionId: requirement.definitionId,
      })),
    );

    return {
      ...student,
      requirements: student.requirements.map((requirement) => {
        const slot = slotMap.get(requirement.id);
        const currentVersion = slot?.versions?.[0] ?? null;

        return {
          ...requirement,
          documentSlotId: slot?.id ?? null,
          displayValue:
            currentVersion?.originalFileName ??
            currentVersion?.textValue ??
            (currentVersion?.dateValue ? currentVersion.dateValue.toISOString().slice(0, 10) : requirement.value),
          currentDocument: currentVersion ? this.documentsService.serializeVersion(currentVersion) : null,
        };
      }),
    };
  }

  async getInductionHistory(studentId: string, user?: AuthenticatedUser) {
    await this.ensureStudentAccess(studentId, user);
    return this.prisma.inductionAttendance.findMany({
      where: { studentId },
      include: {
        induction: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.StudentUpdateInput, user?: AuthenticatedUser) {
    await this.ensureStudentAccess(id, user);

    return this.prisma.student.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, user?: AuthenticatedUser) {
    await this.ensureStudentAccess(id, user);

    return this.prisma.student.delete({
      where: { id },
    });
  }

  async submitRequirement(reqValueId: string, value: string, expiryDate?: string, user?: AuthenticatedUser) {
    if (!user) {
      throw new NotFoundException('Usuario no autenticado');
    }

    return this.documentsService.submitStudentRequirementValueByRequirementId(
      reqValueId,
      { value, expiryDate },
      user,
    );
  }

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plantilla Estudiantes');

    worksheet.columns = [
      { header: 'Nombres (Obligatorio)', key: 'firstName', width: 26 },
      { header: 'Apellidos (Obligatorio)', key: 'lastName', width: 26 },
      { header: 'Tipo Documento (Obligatorio: CC/CE/PA)', key: 'documentType', width: 30 },
      { header: 'Documento (Obligatorio, Único)', key: 'document', width: 24 },
      { header: 'Correo (Obligatorio)', key: 'email', width: 32 },
      { header: 'Celular (Opcional)', key: 'phone', width: 20 },
      { header: 'Institución (Exacto)', key: 'institutionName', width: 30 },
      { header: 'Tipo Estudiante (Exacto)', key: 'studentTypeName', width: 30 },
    ];

    worksheet.addRow({
      firstName: 'Laura',
      lastName: 'Martinez',
      documentType: 'CC',
      document: '1030123456',
      email: 'laura.martinez@correo.com',
      phone: '3001234567',
      institutionName: 'Hospital San José',
      studentTypeName: 'Pregrado',
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async processBulkUpload(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se ha subido ningún archivo');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) throw new BadRequestException('El archivo Excel no tiene hojas válidas');

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as { row: number; message: string }[]
    };

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({
        rowNumber,
        firstName: row.getCell(1).text?.trim(),
        lastName: row.getCell(2).text?.trim(),
        documentType: row.getCell(3).text?.trim().toUpperCase(),
        document: row.getCell(4).text?.trim(),
        email: row.getCell(5).text?.trim(),
        phone: row.getCell(6).text?.trim(),
        institutionName: row.getCell(7).text?.trim(),
        studentTypeName: row.getCell(8).text?.trim(),
      });
    });

    const effectiveRows = rows.filter((r) =>
      r.firstName || r.lastName || r.documentType || r.document || r.email || r.institutionName || r.studentTypeName
    );
    results.total = effectiveRows.length;

    const institutions = await this.prisma.institution.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    });
    const institutionMap = new Map(institutions.map(i => [i.name.toLowerCase().trim(), i.id]));

    const studentTypes = await this.prisma.studentType.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    });
    const studentTypeMap = new Map(studentTypes.map(t => [t.name.toLowerCase().trim(), t.id]));

    for (const row of effectiveRows) {
      try {
        if (!row.firstName || !row.lastName || !row.documentType || !row.document || !row.email || !row.institutionName || !row.studentTypeName) {
          throw new Error('Faltan campos obligatorios');
        }

        if (!['CC', 'CE', 'PA'].includes(row.documentType)) {
          throw new Error('Tipo de documento inválido. Use: CC, CE o PA');
        }

        const institutionId = institutionMap.get(row.institutionName.toLowerCase().trim());
        if (!institutionId) {
          throw new Error(`Institución '${row.institutionName}' no existe en el sistema`);
        }

        const typeId = studentTypeMap.get(row.studentTypeName.toLowerCase().trim());
        if (!typeId) {
          throw new Error(`Tipo de estudiante '${row.studentTypeName}' no existe en el sistema`);
        }

        const createData: Prisma.StudentCreateInput = {
          firstName: row.firstName,
          lastName: row.lastName,
          documentType: row.documentType,
          document: row.document,
          email: row.email,
          phone: row.phone || null,
          institution: { connect: { id: institutionId } },
          type: { connect: { id: typeId } }
        };

        await this.create(createData);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: row.rowNumber,
          message: error?.message || 'Error desconocido'
        });
      }
    }

    return results;
  }

  private async ensureStudentAccess(studentId: string, user?: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        deletedAt: null,
        ...this.studentScope(user),
      },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
  }

  private studentScope(user?: AuthenticatedUser): Prisma.StudentWhereInput {
    if (user?.role === UserRole.INSTITUCION) {
      return {
        institutionId: this.requireInstitutionId(user),
      };
    }

    return {};
  }

  private requireInstitutionId(user: AuthenticatedUser) {
    if (!user.institutionId) {
      throw new NotFoundException('El usuario no tiene una institución asociada.');
    }

    return user.institutionId;
  }
}

