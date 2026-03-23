import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { Prisma } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.TeacherUpdateInput) {
    return this.teachersService.update(id, data);
  }

  @Delete(':id/document/:field')
  deleteDocument(@Param('id') id: string, @Param('field') field: string) {
    if (!['cvFile', 'dataAuthorizationFile', 'conflictOfInterestFile'].includes(field)) {
      throw new BadRequestException('Campo inválido');
    }
    return this.teachersService.uploadDocument(id, field as any, null as any);
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
    @Param('id') id: string,
    @Param('field') field: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('Archivo no subido');
    if (!['cvFile', 'dataAuthorizationFile', 'conflictOfInterestFile'].includes(field)) {
      throw new BadRequestException('Campo inválido');
    }
    const realPath = `/uploads/teachers/${file.filename}`;
    return this.teachersService.uploadDocument(id, field as any, realPath);
  }
}
