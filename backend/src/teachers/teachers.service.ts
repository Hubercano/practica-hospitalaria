import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

type BulkUploadError = {
  row: number;
  message: string;
};

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  private readonly teacherTemplateColumns = [
    'Nombres',
    'Apellidos',
    'Tipo Documento',
    'Documento',
    'Correo',
    'Celular',
    'Tipo Supervisión',
    'Tipo Contrato',
  ];

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
    if (!file.buffer) {
      throw new BadRequestException('No fue posible leer el archivo enviado. Intente nuevamente con un archivo Excel válido.');
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(file.buffer as any);
    } catch {
      throw new BadRequestException('No fue posible leer el archivo Excel. Use la plantilla oficial y no cambie el formato del archivo.');
    }

    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) throw new BadRequestException('El archivo Excel no tiene hojas válidas');

    this.validateTemplateHeaders(worksheet);

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as BulkUploadError[]
    };

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const firstName = this.readCellText(row, 1);
      const lastName = this.readCellText(row, 2);
      const documentType = this.readCellText(row, 3).toUpperCase();
      const document = this.readCellText(row, 4);
      const email = this.readCellText(row, 5);
      const phone = this.readCellText(row, 6);
      const supervisionType = this.readCellText(row, 7).toLowerCase();
      const contractType = this.readCellText(row, 8).toLowerCase();

      rows.push({
        rowNumber,
        firstName,
        lastName,
        documentType,
        document,
        email,
        phone,
        supervisionType,
        contractType,
      });
    });

    const effectiveRows = rows.filter((r) =>
      r.firstName || r.lastName || r.documentType || r.document || r.email || r.supervisionType || r.contractType
    );
    results.total = effectiveRows.length;

    for (const row of effectiveRows) {
      try {
        this.validateTeacherRow(row);

        if (!['CC', 'CE', 'PA'].includes(row.documentType)) {
          throw new BadRequestException('Tipo de documento inválido. Use: CC, CE o PA.');
        }

        if (!['directa', 'indirecta', 'delegada'].includes(row.supervisionType)) {
          throw new BadRequestException('Tipo de supervisión inválido. Use: directa, indirecta o delegada.');
        }

        if (!['interno', 'externo', 'convenio', 'prestador'].includes(row.contractType)) {
          throw new BadRequestException('Tipo de contrato inválido. Use: interno, externo, convenio o prestador.');
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
          message: this.getReadableErrorMessage(error)
        });
      }
    }

    return results;
  }

  private validateTemplateHeaders(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1);
    const mismatchedColumns: string[] = [];

    this.teacherTemplateColumns.forEach((expectedHeader, index) => {
      const cellValue = String(headerRow.getCell(index + 1).text || '').trim();
      if (!this.normalizeHeader(cellValue).startsWith(this.normalizeHeader(expectedHeader))) {
        mismatchedColumns.push(`columna ${index + 1}: se esperaba "${expectedHeader}"`);
      }
    });

    if (mismatchedColumns.length > 0) {
      throw new BadRequestException(
        `La estructura del archivo no coincide con la plantilla de docentes. Revise ${mismatchedColumns.join(', ')}.`
      );
    }
  }

  private validateTeacherRow(row: {
    firstName?: string;
    lastName?: string;
    documentType?: string;
    document?: string;
    email?: string;
    supervisionType?: string;
    contractType?: string;
  }) {
    const missingFields: string[] = [];

    if (!row.firstName) missingFields.push('Nombres');
    if (!row.lastName) missingFields.push('Apellidos');
    if (!row.documentType) missingFields.push('Tipo Documento');
    if (!row.document) missingFields.push('Documento');
    if (!row.email) missingFields.push('Correo');
    if (!row.supervisionType) missingFields.push('Tipo Supervisión');
    if (!row.contractType) missingFields.push('Tipo Contrato');

    if (missingFields.length > 0) {
      throw new BadRequestException(`Faltan campos obligatorios: ${missingFields.join(', ')}.`);
    }

    if (row.email && !this.isValidEmail(row.email)) {
      throw new BadRequestException('El correo no tiene un formato válido.');
    }
  }

  private isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private readCellText(row: ExcelJS.Row, columnNumber: number) {
    const cell = row.getCell(columnNumber);
    const rawValue = cell.value;

    if (rawValue === null || rawValue === undefined) {
      return '';
    }

    if (typeof rawValue === 'object' && 'text' in rawValue && typeof rawValue.text === 'string') {
      return rawValue.text.trim();
    }

    const textValue = typeof cell.text === 'string' ? cell.text : String(cell.text ?? '');
    return textValue.trim();
  }

  private normalizeHeader(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getReadableErrorMessage(error: unknown) {
    if (error instanceof BadRequestException || error instanceof ConflictException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }

      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as { message?: string | string[] }).message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (message) {
          return message;
        }
      }

      return error.message;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Error desconocido al procesar la fila.';
  }
}
