import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InductionsService } from './inductions.service';
import { CreateInductionDto } from './dto/create-induction.dto';
import { UpdateInductionDto } from './dto/update-induction.dto';
import { BulkAllowedStudentsDto } from './dto/bulk-allowed-students.dto';
import { AddAllowedStudentDto } from './dto/add-allowed-student.dto';

@Controller('inductions')
export class InductionsController {
  constructor(private readonly inductionsService: InductionsService) {}

  @Post()
  create(@Body() dto: CreateInductionDto) {
    return this.inductionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.inductionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inductionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInductionDto) {
    return this.inductionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inductionsService.remove(id);
  }

  @Get(':id/link')
  getPermanentLink(@Param('id') id: string) {
    return this.inductionsService.getPermanentLink(id);
  }

  @Post(':id/allowed-students/bulk')
  bulkAddAllowedStudents(@Param('id') id: string, @Body() dto: BulkAllowedStudentsDto) {
    return this.inductionsService.bulkAddAllowedStudents(id, dto.documents);
  }

  @Get(':id/allowed-students')
  listAllowedStudents(@Param('id') id: string) {
    return this.inductionsService.listAllowedStudents(id);
  }

  @Post(':id/allowed-students')
  addAllowedStudent(@Param('id') id: string, @Body() dto: AddAllowedStudentDto) {
    return this.inductionsService.addAllowedStudent(id, dto.document);
  }

  @Delete(':id/allowed-students/:allowedId')
  removeAllowedStudent(@Param('id') id: string, @Param('allowedId') allowedId: string) {
    return this.inductionsService.removeAllowedStudent(id, allowedId);
  }

  @Get(':id/attendances')
  listAttendances(@Param('id') id: string) {
    return this.inductionsService.listAttendances(id);
  }
}
