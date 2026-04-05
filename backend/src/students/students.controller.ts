import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StudentsService } from './students.service';
import { Prisma } from '@prisma/client';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() body: any) {
    if (!body.institutionId) {
      throw new BadRequestException('Debe seleccionar una institución');
    }

    // Adapter payload to Prisma's format, resolving relation connection
    const data: Prisma.StudentCreateInput = {
      firstName: body.firstName,
      lastName: body.lastName,
      documentType: body.documentType,
      document: body.document,
      email: body.email,
      phone: body.phone,
      numeroCarnet: body.numeroCarnet ? String(body.numeroCarnet).trim() : null,
      fechaDevolucionCarnet: body.fechaDevolucionCarnet ? new Date(body.fechaDevolucionCarnet) : null,
      institution: {
        connect: { id: body.institutionId }
      },
      type: {
        connect: { id: body.typeId }
      }
    };
    return this.studentsService.create(data);
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.studentsService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_estudiantes.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadBulk(@UploadedFile() file: Express.Multer.File) {
    return this.studentsService.processBulkUpload(file);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeAll = includeInactive === 'true' || includeInactive === '1';
    return this.studentsService.findAll(includeAll);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Get(':id/inductions')
  getInductionHistory(@Param('id') id: string) {
    return this.studentsService.getInductionHistory(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const data: Prisma.StudentUpdateInput = {
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
      ...(body.documentType !== undefined ? { documentType: body.documentType } : {}),
      ...(body.document !== undefined ? { document: body.document } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.numeroCarnet !== undefined ? { numeroCarnet: body.numeroCarnet ? String(body.numeroCarnet).trim() : null } : {}),
      ...(body.fechaDevolucionCarnet !== undefined
        ? { fechaDevolucionCarnet: body.fechaDevolucionCarnet ? new Date(body.fechaDevolucionCarnet) : null }
        : {}),
      ...(body.state !== undefined ? { state: body.state } : {}),
      ...(body.institutionId ? { institution: { connect: { id: body.institutionId } } } : {}),
      ...(body.typeId ? { type: { connect: { id: body.typeId } } } : {}),
    };

    return this.studentsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @Patch('requirements/:reqValueId/submit')
  submitRequirement(
    @Param('reqValueId') reqValueId: string,
    @Body() data: { value: string; expiryDate?: string }
  ) {
    return this.studentsService.submitRequirement(reqValueId, data.value, data.expiryDate);
  }
}

