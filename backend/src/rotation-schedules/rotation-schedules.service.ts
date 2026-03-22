import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRotationScheduleDto } from './dto/create-rotation-schedule.dto';
import { UpdateRotationScheduleDto } from './dto/update-rotation-schedule.dto';

@Injectable()
export class RotationSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRotationScheduleDto) {
    // Basic business validations
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    // Validate area capacity (maxStudents)
    if (dto.areaId) {
      const area = await this.prisma.rotationArea.findUnique({ where: { id: dto.areaId } });
      if (area && dto.studentIds && dto.studentIds.length > (area.maxStudents || 0)) {
        throw new BadRequestException(`El número de estudiantes (${dto.studentIds.length}) excede el máximo permitido (${area.maxStudents}).`);
      }
    }

    // Check overlapping schedules for same area
    if (dto.areaId) {
      const overlap = await this.prisma.rotationSchedule.findFirst({
        where: {
          areaId: dto.areaId,
          AND: [
            { startDate: { lte: new Date(dto.endDate) } },
            { endDate: { gte: new Date(dto.startDate) } }
          ]
        }
      });
      if (overlap) {
        throw new BadRequestException('Existe otra programación en el mismo rango de fechas para el área seleccionada.');
      }
    }

    const schedule = await this.prisma.rotationSchedule.create({ data: {
      institutionId: dto.institutionId,
      programId: dto.programId,
      areaId: dto.areaId,
      teacherIds: dto.teacherIds || [],
      studentIds: dto.studentIds || [],
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate)
    }});

    return schedule;
  }

  findAll() {
    return this.prisma.rotationSchedule.findMany({ orderBy: { startDate: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.rotationSchedule.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateRotationScheduleDto) {
    if (dto.startDate && dto.endDate && new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    // Validate area capacity if studentIds provided
    if (dto.areaId && dto.studentIds) {
      const area = await this.prisma.rotationArea.findUnique({ where: { id: dto.areaId } });
      if (area && dto.studentIds.length > (area.maxStudents || 0)) {
        throw new BadRequestException(`El número de estudiantes (${dto.studentIds.length}) excede el máximo permitido (${area.maxStudents}).`);
      }
    }

    // Check overlapping schedules for same area excluding current id
    if (dto.areaId && (dto.startDate || dto.endDate)) {
      const start = dto.startDate ? new Date(dto.startDate) : undefined;
      const end = dto.endDate ? new Date(dto.endDate) : undefined;
      const overlap = await this.prisma.rotationSchedule.findFirst({
        where: {
          areaId: dto.areaId,
          id: { not: id },
          AND: [
            start ? { startDate: { lte: end || new Date(dto.endDate || '') } } : {},
            end ? { endDate: { gte: start || new Date(dto.startDate || '') } } : {}
          ]
        }
      });
      if (overlap) {
        throw new BadRequestException('Existe otra programación en el mismo rango de fechas para el área seleccionada.');
      }
    }

    return this.prisma.rotationSchedule.update({ where: { id }, data: {
      institutionId: dto.institutionId,
      programId: dto.programId,
      areaId: dto.areaId,
      teacherIds: dto.teacherIds as any,
      studentIds: dto.studentIds as any,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined
    }});
  }

  remove(id: string) {
    return this.prisma.rotationSchedule.delete({ where: { id } });
  }
}
