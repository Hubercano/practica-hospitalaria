import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { RotationSchedulesService } from './rotation-schedules.service';
import { CreateRotationScheduleDto } from './dto/create-rotation-schedule.dto';
import { UpdateRotationScheduleDto } from './dto/update-rotation-schedule.dto';

@Controller('rotation-schedules')
export class RotationSchedulesController {
  constructor(private readonly service: RotationSchedulesService) {}

  @Post()
  create(@Body() dto: CreateRotationScheduleDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('students/by-start-month')
  findStudentsByStartMonth(@Query('month') monthRaw: string, @Query('year') yearRaw: string) {
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('El parametro month debe ser un entero entre 1 y 12.');
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('El parametro year debe ser un entero valido.');
    }

    return this.service.findStudentsByStartMonth(month, year);
  }

  @Get('groups/by-start-month')
  findGroupsByStartMonth(@Query('month') monthRaw: string, @Query('year') yearRaw: string) {
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('El parametro month debe ser un entero entre 1 y 12.');
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('El parametro year debe ser un entero valido.');
    }

    return this.service.findGroupsByStartMonth(month, year);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRotationScheduleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
