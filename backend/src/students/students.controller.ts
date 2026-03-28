import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
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
      institution: {
        connect: { id: body.institutionId }
      },
      type: {
        connect: { id: body.typeId }
      }
    };
    return this.studentsService.create(data);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const data: Prisma.StudentUpdateInput = {
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
      ...(body.documentType !== undefined ? { documentType: body.documentType } : {}),
      ...(body.document !== undefined ? { document: body.document } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
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

