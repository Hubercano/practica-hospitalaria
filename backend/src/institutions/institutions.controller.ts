import { Controller, Get, Post, Body, Param, Delete, Patch, UseInterceptors, UploadedFile, Res, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto, CreateInstitutionTypeDto, AddRequirementDto, UpdateInstitutionDto } from './dto';
import { EntityState, UserRole } from '@prisma/client';

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

  @Patch('types/:id')
  updateType(@Param('id') id: string, @Body() dto: CreateInstitutionTypeDto) {
    return this.institutionsService.updateType(id, dto);
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

  @Patch(':id')
  updateInstitution(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.institutionsService.updateInstitution(id, dto);
  }

  @Patch(':id/state')
  updateInstitutionState(
    @Param('id') id: string,
    @Body() body: { state: EntityState },
  ) {
    return this.institutionsService.updateInstitutionState(id, body.state);
  }

  @Get()
  @Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
  listAll(@CurrentUser() user: AuthenticatedUser, @Query('includeInactive') includeInactive?: string) {
    const includeAll = includeInactive === 'true' || includeInactive === '1';
    return this.institutionsService.findAll(includeAll, user);
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
  @Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
  getInstitution(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.institutionsService.findOne(id, user);
  }

  @Patch('requirements/:id/submit')
  @Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
  submitRequirement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { value: string, expiryDate?: string }
  ) {
    return this.institutionsService.submitRequirement(id, body.value, body.expiryDate, user);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    return this.institutionsService.processBulkUpload(file);
  }
}
