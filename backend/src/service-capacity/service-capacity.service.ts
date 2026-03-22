import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCapacityDto } from './dto/create-capacity.dto';
import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class ServiceCapacityService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateServiceCapacityDto) {
    const { serviceIds, ...data } = dto;
    return this.prisma.serviceCapacity.create({
      data: {
        ...data,
        services: {
          connect: serviceIds.map(id => ({ id }))
        }
      },
      include: { services: true }
    });
  }

  findAll() {
    return this.prisma.serviceCapacity.findMany({
      include: { services: true }
    });
  }

  findOne(id: string) {
    return this.prisma.serviceCapacity.findUnique({
      where: { id },
      include: { services: true }
    });
  }

  async update(id: string, dto: any) {
    const { serviceIds, ...data } = dto;
    
    if (serviceIds) {
      return this.prisma.serviceCapacity.update({
        where: { id },
        data: {
          ...data,
          services: {
            set: serviceIds.map((sid: string) => ({ id: sid }))
          }
        },
        include: { services: true }
      });
    }

    return this.prisma.serviceCapacity.update({
      where: { id },
      data,
      include: { services: true }
    });
  }

  remove(id: string) {
    return this.prisma.serviceCapacity.delete({
      where: { id }
    });
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

    const headerRow = worksheet.getRow(1);
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      if (cell && cell.value) headerMap[String(cell.value).trim()] = colNumber;
    });

    const required = ['nombre_prestador', 'sede_nombre', 'grupo_capacidad', 'coca_nombre', 'cantidad'];
    for (const h of required) {
      if (!headerMap[h]) {
        throw new BadRequestException(`No se encontró la columna requerida: ${h}`);
      }
    }

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const get = (key: string) => {
        const col = headerMap[key];
        return col ? row.getCell(col).value : null;
      };

      const sedeRaw = get('nombre_prestador');
      const sedeNameRaw = get('sede_nombre');
      const groupRaw = get('grupo_capacidad');
      const conceptRaw = get('coca_nombre');
      const quantityRaw = get('cantidad');

      // Skip completely empty rows
      if (!sedeRaw && !sedeNameRaw && !groupRaw && !conceptRaw && !quantityRaw) return;

      results.total++;

      // Validate required
      if (!sedeRaw || !sedeNameRaw || !groupRaw || !conceptRaw || quantityRaw === null || quantityRaw === undefined) {
        results.failed++;
        results.errors.push({ row: rowNumber, message: 'Campos obligatorios faltantes' });
        return;
      }

      const quantity = Number(quantityRaw);
      if (isNaN(quantity) || quantity < 0) {
        results.failed++;
        results.errors.push({ row: rowNumber, message: 'cantidad debe ser numérica y >= 0' });
        return;
      }

      rows.push({
        rowNumber,
        data: {
          headquarters: String(sedeRaw).trim(),
          headquartersName: String(sedeNameRaw).trim(),
          capacityGroup: String(groupRaw).trim(),
          concept: String(conceptRaw).trim(),
          capacityQuantity: Math.floor(quantity)
        }
      });
    });

    for (const r of rows) {
      try {
        await this.prisma.serviceCapacity.create({
          data: {
            headquarters: r.data.headquarters,
            headquartersName: r.data.headquartersName,
            capacityGroup: r.data.capacityGroup,
            concept: r.data.concept,
            capacityQuantity: r.data.capacityQuantity
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

