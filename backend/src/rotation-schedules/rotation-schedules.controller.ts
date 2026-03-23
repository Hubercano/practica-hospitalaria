import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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
