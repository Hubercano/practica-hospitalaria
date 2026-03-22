import { Controller, Get, Post, Body } from '@nestjs/common';
import { RotationAreasService } from './rotation-areas.service';
import { CreateRotationAreaDto } from './dto/create-rotation-area.dto';

@Controller('rotation-areas')
export class RotationAreasController {
  constructor(private readonly service: RotationAreasService) {}

  @Post()
  create(@Body() dto: CreateRotationAreaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
