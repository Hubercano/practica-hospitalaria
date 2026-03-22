import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StudentsService } from './students.service';
import { Prisma } from '@prisma/client';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() body: any) {
    // Adapter payload to Prisma's format, resolving relation connection
    const data: Prisma.StudentCreateInput = {
      firstName: body.firstName,
      lastName: body.lastName,
      documentType: body.documentType,
      document: body.document,
      email: body.email,
      phone: body.phone,
      type: {
        connect: { id: body.typeId }
      }
    };
    return this.studentsService.create(data);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.StudentUpdateInput) {
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

