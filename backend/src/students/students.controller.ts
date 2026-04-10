import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { StudentsService } from './students.service';
import { Prisma, UserRole } from '@prisma/client';

@Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    const institutionId = user.role === UserRole.INSTITUCION ? user.institutionId : body.institutionId;

    if (!institutionId) {
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
        connect: { id: institutionId }
      },
      type: {
        connect: { id: body.typeId }
      }
    };
    return this.studentsService.create(data, user);
  }

  @Get('template')
  @Roles(UserRole.HOSPITAL)
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
  @Roles(UserRole.HOSPITAL)
  @UseInterceptors(FileInterceptor('file'))
  uploadBulk(@UploadedFile() file: Express.Multer.File) {
    return this.studentsService.processBulkUpload(file);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('includeInactive') includeInactive?: string) {
    const includeAll = includeInactive === 'true' || includeInactive === '1';
    return this.studentsService.findAll(includeAll, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studentsService.findOne(id, user);
  }

  @Get(':id/inductions')
  getInductionHistory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studentsService.getInductionHistory(id, user);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
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
      ...(user.role === UserRole.HOSPITAL && body.institutionId ? { institution: { connect: { id: body.institutionId } } } : {}),
      ...(body.typeId ? { type: { connect: { id: body.typeId } } } : {}),
    };

    return this.studentsService.update(id, data, user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studentsService.remove(id, user);
  }

  @Patch('requirements/:reqValueId/submit')
  submitRequirement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reqValueId') reqValueId: string,
    @Body() data: { value: string; expiryDate?: string }
  ) {
    return this.studentsService.submitRequirement(reqValueId, data.value, data.expiryDate, user);
  }
}

