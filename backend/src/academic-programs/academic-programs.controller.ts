import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { AcademicProgramsService } from './academic-programs.service';
import { CreateAcademicProgramDto } from './dto/create-program.dto';

@Controller('academic-programs')
export class AcademicProgramsController {
  constructor(private readonly service: AcademicProgramsService) {}

  @Post()
  create(@Body() dto: CreateAcademicProgramDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

/*
  @Put(':id/areas/:areaId')
  addArea(@Param('id') id: string, @Param('areaId') areaId: string) {
     return this.service.addRotationArea(id, areaId);
  }

  @Delete(':id/areas/:areaId')
  removeArea(@Param('id') id: string, @Param('areaId') areaId: string) {
    return this.service.removeRotationArea(id, areaId);
  }
*/
}
