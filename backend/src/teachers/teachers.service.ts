import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.TeacherCreateInput) {
    const exists = await this.prisma.teacher.findUnique({
      where: { document: data.document },
    });
    if (exists) throw new ConflictException('Ya existe un docente con este documento');

    const existsEmail = await this.prisma.teacher.findUnique({
      where: { email: data.email },
    });
    if (existsEmail) throw new ConflictException('Ya existe un docente con este correo');

    return this.prisma.teacher.create({ data });
  }

  findAll() {
    return this.prisma.teacher.findMany({
      orderBy: { lastName: 'asc' }
    });
  }

  findOne(id: string) {
    return this.prisma.teacher.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.TeacherUpdateInput) {
    return this.prisma.teacher.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.teacher.delete({ where: { id } });
  }

  updateState(id: string, state: 'ACTIVE' | 'INACTIVE') {
    return this.prisma.teacher.update({
      where: { id },
      data: { state }
    });
  }

  async uploadDocument(id: string, fileField: 'cvFile' | 'dataAuthorizationFile' | 'conflictOfInterestFile', filePath: string) {
    const data: any = {};
    data[fileField] = filePath;
    return this.prisma.teacher.update({
      where: { id },
      data
    });
  }

  async uploadMultipleDocuments(
    id: string,
    fileField: 'teacherTrainingFiles' | 'teacherRecognitionFiles',
    filePaths: string[]
  ) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new ConflictException('Docente no encontrado');

    const currentFiles = (teacher as any)[fileField] || [];
    const mergedFiles = [...currentFiles, ...filePaths];

    return this.prisma.teacher.update({
      where: { id },
      data: {
        [fileField]: mergedFiles
      }
    });
  }

  async deleteMultipleDocument(
    id: string,
    fileField: 'teacherTrainingFiles' | 'teacherRecognitionFiles',
    filePath: string
  ) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new ConflictException('Docente no encontrado');

    const currentFiles = (teacher as any)[fileField] || [];
    const updatedFiles = currentFiles.filter((path: string) => path !== filePath);

    return this.prisma.teacher.update({
      where: { id },
      data: {
        [fileField]: updatedFiles
      }
    });
  }

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plantilla Docentes');

    worksheet.columns = [
      { header: 'Nombres (Obligatorio)', key: 'firstName', width: 26 },
      { header: 'Apellidos (Obligatorio)', key: 'lastName', width: 26 },
      { header: 'Tipo Documento (Obligatorio: CC/CE/PA)', key: 'documentType', width: 30 },
      { header: 'Documento (Obligatorio, Único)', key: 'document', width: 24 },
      { header: 'Correo (Obligatorio)', key: 'email', width: 32 },
      { header: 'Celular (Opcional)', key: 'phone', width: 20 },
      { header: 'Tipo Supervisión (Obligatorio: directa/indirecta/delegada)', key: 'supervisionType', width: 40 },
      { header: 'Tipo Contrato (Obligatorio: interno/externo/convenio/prestador)', key: 'contractType', width: 44 },
    ];

    worksheet.addRow({
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      documentType: 'CC',
      document: '80123456',
      email: 'carlos.rodriguez@correo.com',
      phone: '3101234567',
      supervisionType: 'directa',
      contractType: 'interno',
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
        supervisionType: row.getCell(7).text?.trim().toLowerCase(),
        contractType: row.getCell(8).text?.trim().toLowerCase(),
      });
    });

    const effectiveRows = rows.filter((r) =>
      r.firstName || r.lastName || r.documentType || r.document || r.email || r.supervisionType || r.contractType
    );
    results.total = effectiveRows.length;

    for (const row of effectiveRows) {
      try {
        if (!row.firstName || !row.lastName || !row.documentType || !row.document || !row.email || !row.supervisionType || !row.contractType) {
          throw new Error('Faltan campos obligatorios');
        }

        if (!['CC', 'CE', 'PA'].includes(row.documentType)) {
          throw new Error('Tipo de documento inválido. Use: CC, CE o PA');
        }

        if (!['directa', 'indirecta', 'delegada'].includes(row.supervisionType)) {
          throw new Error('Tipo de supervisión inválido. Use: directa, indirecta o delegada');
        }

        if (!['interno', 'externo', 'convenio', 'prestador'].includes(row.contractType)) {
          throw new Error('Tipo de contrato inválido. Use: interno, externo, convenio o prestador');
        }

        const createData: Prisma.TeacherCreateInput = {
          firstName: row.firstName,
          lastName: row.lastName,
          documentType: row.documentType,
          document: row.document,
          email: row.email,
          phone: row.phone || null,
          supervisionType: row.supervisionType,
          contractType: row.contractType,
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
