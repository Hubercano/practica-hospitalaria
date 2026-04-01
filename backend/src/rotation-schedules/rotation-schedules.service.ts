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

  async findStudentsByStartMonth(month: number, year: number) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const schedules = await this.prisma.rotationSchedule.findMany({
      where: {
        startDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        id: true,
        startDate: true,
        studentIds: true,
      },
    });

    if (!schedules.length) {
      return [];
    }

    const studentStartDateMap = new Map<string, Date>();

    schedules.forEach((schedule) => {
      const startDate = new Date(schedule.startDate);
      (schedule.studentIds || []).forEach((studentId) => {
        if (!studentStartDateMap.has(studentId) || startDate < (studentStartDateMap.get(studentId) as Date)) {
          studentStartDateMap.set(studentId, startDate);
        }
      });
    });

    const studentIds = Array.from(studentStartDateMap.keys());
    if (!studentIds.length) {
      return [];
    }

    const students = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        document: true,
      },
    });

    return students
      .map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        document: student.document,
        rotationStartDate: (studentStartDateMap.get(student.id) as Date).toISOString(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findGroupsByStartMonth(month: number, year: number) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const schedules = await this.prisma.rotationSchedule.findMany({
      where: {
        startDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        id: true,
        startDate: true,
        studentIds: true,
        areaId: true,
        programId: true,
        institutionId: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    if (!schedules.length) {
      return [];
    }

    const areaIds = Array.from(new Set(schedules.map((s) => s.areaId).filter((id): id is string => !!id)));
    const programIds = Array.from(new Set(schedules.map((s) => s.programId).filter((id): id is string => !!id)));
    const institutionIds = Array.from(new Set(schedules.map((s) => s.institutionId).filter((id): id is string => !!id)));

    const [areas, programs, institutions] = await Promise.all([
      areaIds.length
        ? this.prisma.rotationArea.findMany({ where: { id: { in: areaIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      programIds.length
        ? this.prisma.academicProgram.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      institutionIds.length
        ? this.prisma.institution.findMany({ where: { id: { in: institutionIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);

    const areaMap = new Map(areas.map((row) => [row.id, row.name]));
    const programMap = new Map(programs.map((row) => [row.id, row.name]));
    const institutionMap = new Map(institutions.map((row) => [row.id, row.name]));

    const allStudentIds = Array.from(
      new Set(schedules.flatMap((schedule) => schedule.studentIds || []).filter(Boolean)),
    );

    if (!allStudentIds.length) {
      return schedules.map((schedule) => ({
        id: schedule.id,
        name:
          areaMap.get(schedule.areaId || '') ||
          programMap.get(schedule.programId || '') ||
          institutionMap.get(schedule.institutionId || '') ||
          `Rotación ${schedule.id.slice(0, 8)}`,
        startDate: schedule.startDate.toISOString(),
        studentCount: 0,
        students: [],
      }));
    }

    const students = await this.prisma.student.findMany({
      where: {
        id: { in: allStudentIds },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        document: true,
      },
    });

    const studentMap = new Map(
      students.map((student) => [
        student.id,
        {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          document: student.document,
        },
      ]),
    );

    return schedules.map((schedule) => {
      const groupStudents = (schedule.studentIds || [])
        .map((studentId) => studentMap.get(studentId))
        .filter((student): student is { id: string; name: string; document: string } => !!student)
        .sort((a, b) => a.name.localeCompare(b.name));

      const groupName = [
        areaMap.get(schedule.areaId || ''),
        programMap.get(schedule.programId || ''),
        institutionMap.get(schedule.institutionId || ''),
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        id: schedule.id,
        name: groupName || `Rotación ${schedule.id.slice(0, 8)}`,
        startDate: schedule.startDate.toISOString(),
        studentCount: groupStudents.length,
        students: groupStudents,
      };
    });
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
