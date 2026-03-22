import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StudentTypesService } from './student-types.service';
import { Prisma } from '@prisma/client';

@Controller('student-types')
export class StudentTypesController {
  constructor(private readonly studentTypesService: StudentTypesService) {}

  @Post()
  create(@Body() data: Prisma.StudentTypeCreateInput) {
    return this.studentTypesService.create(data);
  }

  @Get()
  findAll() {
    return this.studentTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentTypesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.StudentTypeUpdateInput) {
    return this.studentTypesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentTypesService.remove(id);
  }

  @Post(':id/requirements')
  addRequirement(@Param('id') id: string, @Body() data: Prisma.StudentRequirementDefinitionCreateInput) {
    return this.studentTypesService.addRequirement(id, data as any);
  }

  @Delete('requirements/:reqId')
  removeRequirement(@Param('reqId') reqId: string) {
    return this.studentTypesService.removeRequirement(reqId);
  }
}