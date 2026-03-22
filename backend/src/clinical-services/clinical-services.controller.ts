import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClinicalServicesService } from './clinical-services.service';
import { CreateClinicalServiceDto } from './dto/create-clinical-service.dto';
import type { Response } from 'express';

@Controller('clinical-services')
export class ClinicalServicesController {
  constructor(private readonly clinicalServicesService: ClinicalServicesService) {}

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.clinicalServicesService.generateTemplate();
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_servicios_clinicos.xlsx',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    try {
      const result = await this.clinicalServicesService.processBulkUpload(file);
      // Temporary log to debug bulk upload results
      console.log('[clinical-services] bulkUpload result:', JSON.stringify(result));
      return result;
    } catch (err) {
      console.error('[clinical-services] bulkUpload error:', err);
      throw err;
    }
  }

  @Post()
  create(@Body() createClinicalServiceDto: CreateClinicalServiceDto) {
    return this.clinicalServicesService.create(createClinicalServiceDto);
  }

  @Get()
  findAll() {
    return this.clinicalServicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinicalServicesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: Partial<CreateClinicalServiceDto>) {
    return this.clinicalServicesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clinicalServicesService.remove(id);
  }
}
