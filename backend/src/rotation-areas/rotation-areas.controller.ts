import { Controller, Get, Post, Body, Param, Put, Patch } from '@nestjs/common';
import { RotationAreasService } from './rotation-areas.service';
import { CreateRotationAreaDto } from './dto/create-rotation-area.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Roles(UserRole.HOSPITAL)
@Controller('rotation-areas')
export class RotationAreasController {
  constructor(private readonly service: RotationAreasService) {}

  @Post()
  create(@Body() dto: CreateRotationAreaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRotationAreaDto> & { state?: 'ACTIVE' | 'INACTIVE' }) {
    return this.service.update(id, dto);
  }

  @Patch(':id')
  updateState(@Param('id') id: string, @Body() dto: { state: 'ACTIVE' | 'INACTIVE' }) {
    return this.service.update(id, dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
