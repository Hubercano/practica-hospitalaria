import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.TeacherCreateInput) {
    const exists = await this.prisma.teacher.findUnique({
      where: { document: data.document },
    });
    if (exists) throw new ConflictException('Ya existe un docente con este documento');

    const existsEmail = await this.prisma.teacher.findUnique({
      where: { email: data.email },
    });
    if (existsEmail) throw new ConflictException('Ya existe un docente con este correo');

    return this.prisma.teacher.create({ data });
  }

  findAll() {
    return this.prisma.teacher.findMany({
      orderBy: { lastName: 'asc' }
    });
  }

  findOne(id: string) {
    return this.prisma.teacher.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.TeacherUpdateInput) {
    return this.prisma.teacher.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.teacher.delete({ where: { id } });
  }

  updateState(id: string, state: 'ACTIVE' | 'INACTIVE') {
    return this.prisma.teacher.update({
      where: { id },
      data: { state }
    });
  }

  async uploadDocument(id: string, fileField: 'cvFile' | 'dataAuthorizationFile' | 'conflictOfInterestFile', filePath: string) {
    const data: any = {};
    data[fileField] = filePath;
    return this.prisma.teacher.update({
      where: { id },
      data
    });
  }

  async uploadMultipleDocuments(
    id: string,
    fileField: 'teacherTrainingFiles' | 'teacherRecognitionFiles',
    filePaths: string[]
  ) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new ConflictException('Docente no encontrado');

    const currentFiles = (teacher as any)[fileField] || [];
    const mergedFiles = [...currentFiles, ...filePaths];

    return this.prisma.teacher.update({
      where: { id },
      data: {
        [fileField]: mergedFiles
      }
    });
  }

  async deleteMultipleDocument(
    id: string,
    fileField: 'teacherTrainingFiles' | 'teacherRecognitionFiles',
    filePath: string
  ) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new ConflictException('Docente no encontrado');

    const currentFiles = (teacher as any)[fileField] || [];
    const updatedFiles = currentFiles.filter((path: string) => path !== filePath);

    return this.prisma.teacher.update({
      where: { id },
      data: {
        [fileField]: updatedFiles
      }
    });
  }
}
