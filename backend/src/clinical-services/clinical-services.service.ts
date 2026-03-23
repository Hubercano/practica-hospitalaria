import { Injectable, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicalServiceDto } from './dto/create-clinical-service.dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ClinicalServicesService {
  constructor(private prisma: PrismaService) {}

  async create(createClinicalServiceDto: CreateClinicalServiceDto) {
    try {
      return await this.prisma.clinicalService.create({
        data: createClinicalServiceDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Ya existe un servicio con este código.');
        }
      }
      throw new InternalServerErrorException('Error al crear el servicio');     
    }
  }

  findAll() {
    return this.prisma.clinicalService.findMany({
      orderBy: { name: 'asc' },
      include: { capacities: true }
    });
  }

  findOne(id: string) {
    return this.prisma.clinicalService.findUnique({
      where: { id },
      include: {
        capacities: true
      }
    });
  }

  update(id: string, updateDto: Partial<CreateClinicalServiceDto>) {
    return this.prisma.clinicalService.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.clinicalService.delete({
      where: { id },
    });
  }

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Servicios Clx');

    worksheet.columns = [
      { header: 'numero_distintivo', key: 'code', width: 25 },
      { header: 'serv_nombre', key: 'name', width: 35 },
      { header: 'sede_nombre', key: 'venueName', width: 35 },
      { header: 'numero_sede', key: 'venueSequence', width: 20 },
      { header: 'codigo_habilitacion', key: 'venueCode', width: 25 },
    ];

    worksheet.addRow({
      code: 'SV-001',
      name: 'Urgencias Generales',
      venueName: 'Sede Principal',
      venueSequence: 1,
      venueCode: 'HSJ-001'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    // writeBuffer can return ArrayBuffer or Buffer depending on environment —
    // normalize to Node Buffer for response
    return Buffer.from(buffer as any);
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

    // Build a map from header name -> column number so we can read columns by header
    const headerRow = worksheet.getRow(1);
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      if (cell && cell.value) {
        headerMap[String(cell.value).trim()] = colNumber;
      }
    });

    const requiredHeaders = ['numero_distintivo', 'serv_nombre'];
    for (const h of requiredHeaders) {
      if (!headerMap[h]) {
        throw new BadRequestException(`No se encontró la columna requerida: ${h}`);
      }
    }

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip headers

      const get = (key: string) => {
        const col = headerMap[key];
        return col ? row.getCell(col).value : null;
      };

      const codeRaw = get('numero_distintivo');
      const nameRaw = get('serv_nombre');
      const venueNameRaw = get('sede_nombre');
      const venueSeqRaw = get('numero_sede');
      const venueCodeRaw = get('codigo_habilitacion');

      if (!codeRaw || !nameRaw) {
        results.failed++;
        results.errors.push({ row: rowNumber, message: 'numero_distintivo y serv_nombre son obligatorios' });
        return;
      }

      rows.push({
        rowNumber,
        data: {
          code: String(codeRaw).trim(),
          name: String(nameRaw).trim(),
          venueName: venueNameRaw ? String(venueNameRaw).trim() : null,
          venueSequence: venueSeqRaw ? parseInt(String(venueSeqRaw), 10) : null,
          venueCode: venueCodeRaw ? String(venueCodeRaw).trim() : null
        }
      });
      results.total++;
    });

    for (const r of rows) {
      try {
        const venueSeq = isNaN(r.data.venueSequence) ? null : r.data.venueSequence;
        await this.prisma.clinicalService.upsert({
          where: { code: r.data.code },
          update: {
            name: r.data.name,
            venueName: r.data.venueName,
            venueSequence: venueSeq,
            venueCode: r.data.venueCode,
          },
          create: {
             code: r.data.code,
             name: r.data.name,
             venueName: r.data.venueName,
             venueSequence: venueSeq,
             venueCode: r.data.venueCode,
          }
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: r.rowNumber, message: err.message || 'Error guardando en BD' });
      }
    }

    return results;
  }
}
