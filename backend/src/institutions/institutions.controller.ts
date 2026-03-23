import { Controller, Get, Post, Body, Param, Delete, Patch, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto, CreateInstitutionTypeDto, AddRequirementDto } from './dto';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get('types')
  listTypes() {
    return this.institutionsService.getTypes();
  }

  @Post('types')
  createType(@Body() dto: CreateInstitutionTypeDto) {
    return this.institutionsService.createType(dto);
  }

  @Get('types/:id')
  getType(@Param('id') id: string) {
    return this.institutionsService.getType(id);
  }

  @Post('types/:id/requirements')
  addRequirement(@Param('id') id: string, @Body() dto: AddRequirementDto) {
    return this.institutionsService.addRequirementToType(id, dto);
  }

  @Delete('requirements/:id')
  deleteRequirement(@Param('id') id: string) {
    return this.institutionsService.removeRequirement(id);
  }

  @Delete('types/:id')
  deleteType(@Param('id') id: string) {
    return this.institutionsService.removeType(id);
  }

  @Delete(':id')
  deleteInstitution(@Param('id') id: string) {
    return this.institutionsService.removeInstitution(id);
  }

  @Get('types/:id/requirements')
  listRequirements(@Param('id') id: string) {
    return this.institutionsService.getRequirementsForType(id);
  }

  @Post()
  registerInstitution(@Body() dto: CreateInstitutionDto) {
    return this.institutionsService.create(dto);
  }

  @Get()
  listAll() {
    return this.institutionsService.findAll();
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.institutionsService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_instituciones.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  getInstitution(@Param('id') id: string) {
    return this.institutionsService.findOne(id);
  }

  @Patch('requirements/:id/submit')
  submitRequirement(
    @Param('id') id: string,
    @Body() body: { value: string, expiryDate?: string }
  ) {
    return this.institutionsService.submitRequirement(id, body.value, body.expiryDate);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    return this.institutionsService.processBulkUpload(file);
  }
}
