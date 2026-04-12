import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, Res } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { Prisma } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Roles(UserRole.HOSPITAL)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {
    if (!fs.existsSync('./uploads/teachers')) {
      fs.mkdirSync('./uploads/teachers', { recursive: true });
    }
  }

  @Post()
  create(@Body() data: Prisma.TeacherCreateInput) {
    return this.teachersService.create(data);
  }

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.teachersService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_docentes.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadBulk(@UploadedFile() file: Express.Multer.File) {
    return this.teachersService.processBulkUpload(file);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.TeacherUpdateInput) {
    return this.teachersService.update(id, data);
  }

  @Patch(':id/state')
  updateState(@Param('id') id: string, @Body() body: { state: 'ACTIVE' | 'INACTIVE' }) {
    return this.teachersService.updateState(id, body.state);
  }

  @Delete(':id/document/:field')
  deleteDocument(@Param('id') id: string, @Param('field') field: string) {
    if (!['cvFile', 'dataAuthorizationFile', 'conflictOfInterestFile'].includes(field)) {
      throw new BadRequestException('Campo inválido');
    }
    return this.teachersService.deleteDocument(id, field as any);
  }

  @Delete(':id/document-multiple/:field')
  deleteMultipleDocument(
    @Param('id') id: string,
    @Param('field') field: string,
    @Query('filePath') filePath: string
  ) {
    if (!['teacherTrainingFiles', 'teacherRecognitionFiles'].includes(field)) {
      throw new BadRequestException('Campo inválido para eliminación múltiple');
    }
    if (!filePath) {
      throw new BadRequestException('filePath es requerido');
    }
    return this.teachersService.deleteMultipleDocument(id, field as any, filePath);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }

  @Post(':id/upload/:field')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/teachers',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${req.params.id}-${req.params.field}-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('field') field: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('Archivo no subido');
    if (!['cvFile', 'dataAuthorizationFile', 'conflictOfInterestFile'].includes(field)) {
      throw new BadRequestException('Campo inválido');
    }
    return this.teachersService.uploadDocument(id, field as any, file, user);
  }

  @Post(':id/upload-multiple/:field')
  @UseInterceptors(FilesInterceptor('files', 20, {
    storage: diskStorage({
      destination: './uploads/teachers',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${req.params.id}-${req.params.field}-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  uploadMultipleDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('field') field: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!files || files.length === 0) throw new BadRequestException('Archivos no subidos');
    if (!['teacherTrainingFiles', 'teacherRecognitionFiles'].includes(field)) {
      throw new BadRequestException('Campo inválido para carga múltiple');
    }

    return this.teachersService.uploadMultipleDocuments(id, field as any, files, user);
  }
}
