import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ValidationStatus } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.StudentCreateInput) {
    // 1. Check if student already exists by document
    const exists = await this.prisma.student.findUnique({
      where: { document: data.document },
    });
    if (exists) {
      throw new ConflictException('Estudiante ya existe con este documento');
    }

    // 2. We need the typeId to get the requirements definitions
    // The data passed usually has the connect syntax for relational fields in Prisma
    const typeId = data.type.connect?.id;
    if (!typeId) {
       throw new ConflictException('Se requiere el ID del tipo de estudiante');
    }

    // 3. Create student
    const student = await this.prisma.student.create({ data });

    // 4. Create requirement placeholders for the newly created student based on their type
    const requirements = await this.prisma.studentRequirementDefinition.findMany({
      where: { studentTypeId: typeId },
    });

    const initData = requirements.map((req) => ({
      studentId: student.id,
      definitionId: req.id,
      status: ValidationStatus.PENDING,
      value: null,
    }));

    if (initData.length > 0) {
      await this.prisma.studentRequirementValue.createMany({
        data: initData,
      });
    }

    return student;
  }

  async findAll() {
    const students = await this.prisma.student.findMany({
      include: { 
        type: { include: { requirements: true } }, 
        requirements: { include: { definition: true } } 
      },
      orderBy: { lastName: 'asc' }
    });

    return students.map(student => {
      let status = 'COMPLETADO';
      let hasCritical = false;
      let hasExpiringSoon = false;
      let hasPending = false;

      const now = new Date();
      now.setHours(0,0,0,0);

      const criticalThreshold = new Date(now);
      criticalThreshold.setDate(now.getDate() + 5);

      const warningThreshold = new Date(now);
      warningThreshold.setDate(now.getDate() + 30);

      const valuesMap = new Map(student.requirements.map(r => [r.definitionId, r]));

      for (const def of student.type.requirements) {
        const val = valuesMap.get(def.id);

        // 1. Verify missing required documents
        if (def.isRequired) {
            if (!val || !val.value || val.status === ValidationStatus.PENDING) {
                hasPending = true;
            }
        }

        // 2. Verify expirations
        if (val && val.expiryDate) {
            const expiry = new Date(val.expiryDate);
            expiry.setHours(0,0,0,0);

            if (expiry <= criticalThreshold) {
                hasCritical = true;
            } else if (expiry <= warningThreshold) {
                hasExpiringSoon = true;
            }
        }
      }

      // Priority: CRITICAL > EXPIRING > PENDING > COMPLETED
      if (hasCritical) {
        status = 'CRÍTICO';
      } else if (hasExpiringSoon) {
        status = 'PRÓXIMO A VENCER';
      } else if (hasPending) {
        status = 'PENDIENTE';
      }

      return {
        ...student,
        status
      };
    });
  }

  findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { type: true, requirements: { include: { definition: true } } },
    });
  }

  update(id: string, data: Prisma.StudentUpdateInput) {
    return this.prisma.student.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.student.delete({
      where: { id },
    });
  }

  async submitRequirement(reqValueId: string, value: string, expiryDate?: string) {
    return this.prisma.studentRequirementValue.update({
      where: { id: reqValueId },
      data: {
        value,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: value ? ValidationStatus.APPROVED : ValidationStatus.PENDING, // Auto approve or add review logic
      }
    });
  }
}

