import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityState, Prisma, ValidationStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.StudentCreateInput) {
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

  async findAll(includeInactive = false) {
    const students = await this.prisma.student.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { state: EntityState.ACTIVE }),
      },
      include: { 
        institution: true,
        type: { include: { requirements: true } }, 
        requirements: { include: { definition: true } } 
      },
      orderBy: { lastName: 'asc' }
    });

    return students.map(student => {
      let status = 'COMPLETADO';
      let hasCritical = false;
      let hasExpiringSoon = false;
      let hasPending = false;

      const now = new Date();
      now.setHours(0,0,0,0);

      const criticalThreshold = new Date(now);
      criticalThreshold.setDate(now.getDate() + 5);

      const warningThreshold = new Date(now);
      warningThreshold.setDate(now.getDate() + 30);

      const valuesMap = new Map(student.requirements.map(r => [r.definitionId, r]));

      for (const def of student.type.requirements) {
        const val = valuesMap.get(def.id);

        // 1. Verify missing required documents
        if (def.isRequired) {
            if (!val || !val.value || val.status === ValidationStatus.PENDING) {
                hasPending = true;
            }
        }

        // 2. Verify expirations
        if (val && val.expiryDate) {
            const expiry = new Date(val.expiryDate);
            expiry.setHours(0,0,0,0);

            if (expiry <= criticalThreshold) {
                hasCritical = true;
            } else if (expiry <= warningThreshold) {
                hasExpiringSoon = true;
            }
        }
      }

      // Priority: CRITICAL > EXPIRING > PENDING > COMPLETED
      if (hasCritical) {
        status = 'CRÍTICO';
      } else if (hasExpiringSoon) {
        status = 'PRÓXIMO A VENCER';
      } else if (hasPending) {
        status = 'PENDIENTE';
      }

      return {
        ...student,
        status
      };
    });
  }

  findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { institution: true, type: true, requirements: { include: { definition: true } } },
    });
  }

  update(id: string, data: Prisma.StudentUpdateInput) {
    return this.prisma.student.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.student.delete({
      where: { id },
    });
  }

  async submitRequirement(reqValueId: string, value: string, expiryDate?: string) {
    return this.prisma.studentRequirementValue.update({
      where: { id: reqValueId },
      data: {
        value,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: value ? ValidationStatus.APPROVED : ValidationStatus.PENDING, // Auto approve or add review logic
      }
    });
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
}

