import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServiceCapacityService } from './service-capacity.service';
import { CreateServiceCapacityDto } from './dto/create-capacity.dto';

@Controller('service-capacities')
export class ServiceCapacityController {
  constructor(private readonly service: ServiceCapacityService) {}

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    try {
      const result = await this.service.processBulkUpload(file);
      return result;
    } catch (err) {
      console.error('[service-capacity] bulkUpload error:', err);
      throw err;
    }
  }

  @Post()
  create(@Body() dto: CreateServiceCapacityDto) {
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
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
