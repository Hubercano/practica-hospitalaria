import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentTypesService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.StudentTypeCreateInput) {
    return this.prisma.studentType.create({ data });
  }

  findAll() {
    return this.prisma.studentType.findMany({
      include: { requirements: true, students: true },
    });
  }

  findOne(id: string) {
    return this.prisma.studentType.findUnique({
      where: { id },
      include: { requirements: true, students: true },
    });
  }

  update(id: string, data: Prisma.StudentTypeUpdateInput) {
    return this.prisma.studentType.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.studentType.delete({
      where: { id },
    });
  }

  addRequirement(studentTypeId: string, data: Prisma.StudentRequirementDefinitionCreateWithoutStudentTypeInput) {
    return this.prisma.studentRequirementDefinition.create({
      data: {
        ...data,
        studentTypeId,
      },
    });
  }

  removeRequirement(id: string) {
    return this.prisma.studentRequirementDefinition.delete({
      where: { id },
    });
  }
}