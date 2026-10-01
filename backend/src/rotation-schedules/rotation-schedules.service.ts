import { BadRequestException, Injectable } from '@nestjs/common';
import { RotationScheduleMode, RotationShiftType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRotationScheduleDto, RotationFixedBlockDto, RotationShiftDefinitionDto } from './dto/create-rotation-schedule.dto';
import { UpdateRotationScheduleDto } from './dto/update-rotation-schedule.dto';
import { RotationShiftBoardAssignmentDto, UpdateRotationShiftBoardDto } from './dto/update-rotation-shift-board.dto';

@Injectable()
export class RotationSchedulesService {
  constructor(private prisma: PrismaService) {}

  private readonly scheduleInclude = {
    fixedBlocks: {
      orderBy: [{ dayOfWeek: 'asc' as const }, { startTime: 'asc' as const }],
      include: {
        service: { select: { id: true, name: true, code: true } },
      },
    },
    shiftDefinitions: {
      orderBy: [{ startTime: 'asc' as const }, { endTime: 'asc' as const }, { name: 'asc' as const }],
    },
    shiftAssignments: {
      orderBy: [{ assignmentDate: 'asc' as const }, { studentId: 'asc' as const }],
      include: {
        shiftDefinition: true,
      },
    },
  };

  async create(dto: CreateRotationScheduleDto) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    const scheduleMode = dto.scheduleMode ?? RotationScheduleMode.FIXED;
    this.validateScheduleDetails(scheduleMode, dto.fixedBlocks ?? [], dto.shiftDefinitions ?? []);

    if (dto.areaId) {
      const area = await this.prisma.rotationArea.findUnique({ where: { id: dto.areaId } });
      if (area && dto.studentIds && dto.studentIds.length > (area.maxStudents || 0)) {
        throw new BadRequestException(`El numero de estudiantes (${dto.studentIds.length}) excede el maximo permitido (${area.maxStudents}).`);
      }
    }

    if (dto.areaId) {
      const overlap = await this.prisma.rotationSchedule.findFirst({
        where: {
          areaId: dto.areaId,
          AND: [{ startDate: { lte: new Date(dto.endDate) } }, { endDate: { gte: new Date(dto.startDate) } }],
        },
      });
      if (overlap) {
        throw new BadRequestException('Existe otra programacion en el mismo rango de fechas para el area seleccionada.');
      }
    }

    return this.prisma.rotationSchedule.create({
      data: {
        institutionId: dto.institutionId,
        programId: dto.programId,
        areaId: dto.areaId,
        teacherIds: dto.teacherIds || [],
        studentIds: dto.studentIds || [],
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        scheduleMode,
        shiftBoardPublishDaysBefore: scheduleMode === RotationScheduleMode.SHIFT_BOARD ? dto.shiftBoardPublishDaysBefore ?? 8 : null,
        fixedBlocks:
          scheduleMode === RotationScheduleMode.FIXED && (dto.fixedBlocks?.length ?? 0) > 0
            ? { create: this.buildFixedBlockCreates(dto.fixedBlocks ?? []) }
            : undefined,
        shiftDefinitions:
          scheduleMode === RotationScheduleMode.SHIFT_BOARD && (dto.shiftDefinitions?.length ?? 0) > 0
            ? { create: this.buildShiftDefinitionCreates(dto.shiftDefinitions ?? []) }
            : undefined,
      },
      include: this.scheduleInclude,
    });
  }

  findAll() {
    return this.prisma.rotationSchedule.findMany({
      orderBy: { startDate: 'desc' },
      include: this.scheduleInclude,
    });
  }

  findOne(id: string) {
    return this.prisma.rotationSchedule.findUnique({
      where: { id },
      include: this.scheduleInclude,
    });
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

    const allStudentIds = Array.from(new Set(schedules.flatMap((schedule) => schedule.studentIds || []).filter(Boolean)));

    if (!allStudentIds.length) {
      return schedules.map((schedule) => ({
        id: schedule.id,
        name:
          areaMap.get(schedule.areaId || '') ||
          programMap.get(schedule.programId || '') ||
          institutionMap.get(schedule.institutionId || '') ||
          `Rotacion ${schedule.id.slice(0, 8)}`,
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

      const groupName = [areaMap.get(schedule.areaId || ''), programMap.get(schedule.programId || ''), institutionMap.get(schedule.institutionId || '')]
        .filter(Boolean)
        .join(' - ');

      return {
        id: schedule.id,
        name: groupName || `Rotacion ${schedule.id.slice(0, 8)}`,
        startDate: schedule.startDate.toISOString(),
        studentCount: groupStudents.length,
        students: groupStudents,
      };
    });
  }

  async update(id: string, dto: UpdateRotationScheduleDto) {
    const current = await this.prisma.rotationSchedule.findUnique({
      where: { id },
      include: { fixedBlocks: true, shiftDefinitions: true },
    });
    if (!current) {
      throw new BadRequestException('La programacion no existe.');
    }

    const nextStartDate = dto.startDate ? new Date(dto.startDate) : current.startDate;
    const nextEndDate = dto.endDate ? new Date(dto.endDate) : current.endDate;

    if (nextEndDate <= nextStartDate) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    const nextMode = dto.scheduleMode ?? current.scheduleMode;
    const nextFixedBlocks = (dto.fixedBlocks ?? current.fixedBlocks) as RotationFixedBlockDto[] | undefined;
    const nextShiftDefinitions = (dto.shiftDefinitions ?? current.shiftDefinitions) as RotationShiftDefinitionDto[] | undefined;
    this.validateScheduleDetails(nextMode, nextFixedBlocks, nextShiftDefinitions);

    const nextAreaId = dto.areaId ?? current.areaId;
    const nextStudentIds = dto.studentIds ?? current.studentIds;

    if (nextAreaId) {
      const area = await this.prisma.rotationArea.findUnique({ where: { id: nextAreaId } });
      if (area && nextStudentIds && nextStudentIds.length > (area.maxStudents || 0)) {
        throw new BadRequestException(`El numero de estudiantes (${nextStudentIds.length}) excede el maximo permitido (${area.maxStudents}).`);
      }
    }

    if (nextAreaId && (dto.startDate || dto.endDate || dto.areaId)) {
      const overlap = await this.prisma.rotationSchedule.findFirst({
        where: {
          areaId: nextAreaId,
          id: { not: id },
          AND: [{ startDate: { lte: nextEndDate } }, { endDate: { gte: nextStartDate } }],
        },
      });
      if (overlap) {
        throw new BadRequestException('Existe otra programacion en el mismo rango de fechas para el area seleccionada.');
      }
    }

    return this.prisma.rotationSchedule.update({
      where: { id },
      data: {
        institutionId: dto.institutionId,
        programId: dto.programId,
        areaId: dto.areaId,
        teacherIds: dto.teacherIds as any,
        studentIds: dto.studentIds as any,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        scheduleMode: dto.scheduleMode,
        shiftBoardPublishDaysBefore:
          nextMode === RotationScheduleMode.SHIFT_BOARD
            ? dto.shiftBoardPublishDaysBefore ?? current.shiftBoardPublishDaysBefore ?? 8
            : null,
        fixedBlocks:
          dto.fixedBlocks !== undefined || dto.scheduleMode !== undefined
            ? {
                deleteMany: {},
                create: nextMode === RotationScheduleMode.FIXED ? this.buildFixedBlockCreates(dto.fixedBlocks ?? []) : [],
              }
            : undefined,
        shiftDefinitions:
          dto.shiftDefinitions !== undefined || dto.scheduleMode !== undefined
            ? {
                deleteMany: {},
                create: nextMode === RotationScheduleMode.SHIFT_BOARD ? this.buildShiftDefinitionCreates(dto.shiftDefinitions ?? []) : [],
              }
            : undefined,
        shiftAssignments:
          dto.shiftDefinitions !== undefined || dto.scheduleMode !== undefined || dto.studentIds !== undefined || dto.startDate !== undefined || dto.endDate !== undefined
            ? {
                deleteMany: {},
              }
            : undefined,
      },
      include: this.scheduleInclude,
    });
  }

  async updateShiftBoard(id: string, dto: UpdateRotationShiftBoardDto) {
    const schedule = await this.prisma.rotationSchedule.findUnique({
      where: { id },
      include: { shiftDefinitions: true },
    });

    if (!schedule) {
      throw new BadRequestException('La programacion no existe.');
    }

    if (schedule.scheduleMode !== RotationScheduleMode.SHIFT_BOARD) {
      throw new BadRequestException('La programacion seleccionada no usa cuadro de turnos.');
    }

    const assignments = dto.assignments ?? [];
    this.validateShiftBoardAssignments(schedule, assignments);

    return this.prisma.rotationSchedule.update({
      where: { id },
      data: {
        shiftAssignments: {
          deleteMany: {},
          create: this.buildShiftBoardAssignmentCreates(assignments),
        },
      },
      include: this.scheduleInclude,
    });
  }

  remove(id: string) {
    return this.prisma.rotationSchedule.delete({ where: { id } });
  }

  private validateScheduleDetails(mode: RotationScheduleMode, fixedBlocks: RotationFixedBlockDto[] | undefined, shiftDefinitions: RotationShiftDefinitionDto[] | undefined) {
    if (mode === RotationScheduleMode.FIXED) {
      if (!fixedBlocks?.length) {
        throw new BadRequestException('Debe configurar al menos un bloque de horario fijo.');
      }

      fixedBlocks.forEach((block, index) => {
        if (block.endTime <= block.startTime) {
          throw new BadRequestException(`El bloque fijo #${index + 1} tiene un rango de hora invalido.`);
        }
      });
    }

    if (mode === RotationScheduleMode.SHIFT_BOARD) {
      if (!shiftDefinitions?.length) {
        throw new BadRequestException('Debe configurar al menos un turno para cuadro de turnos.');
      }

      shiftDefinitions.forEach((shift, index) => {
        if (shift.endTime <= shift.startTime) {
          throw new BadRequestException(`El turno #${index + 1} tiene un rango de hora invalido.`);
        }
      });
    }
  }

  private validateShiftBoardAssignments(
    schedule: { startDate: Date; endDate: Date; studentIds: string[]; shiftDefinitions: { id: string }[] },
    assignments: RotationShiftBoardAssignmentDto[],
  ) {
    const validStudentIds = new Set(schedule.studentIds || []);
    const validShiftDefinitionIds = new Set(schedule.shiftDefinitions.map((item) => item.id));
    const seen = new Set<string>();

    assignments.forEach((assignment, index) => {
      if (!validStudentIds.has(assignment.studentId)) {
        throw new BadRequestException(`La asignacion #${index + 1} contiene un estudiante que no pertenece a la rotacion.`);
      }

      if (!validShiftDefinitionIds.has(assignment.shiftDefinitionId)) {
        throw new BadRequestException(`La asignacion #${index + 1} contiene un turno no valido.`);
      }

      const dateOnly = assignment.assignmentDate.slice(0, 10);
      const startOnly = schedule.startDate.toISOString().slice(0, 10);
      const endOnly = schedule.endDate.toISOString().slice(0, 10);
      if (dateOnly < startOnly || dateOnly > endOnly) {
        throw new BadRequestException(`La asignacion #${index + 1} esta fuera del rango de fechas de la rotacion.`);
      }

      const key = `${assignment.studentId}::${dateOnly}`;
      if (seen.has(key)) {
        throw new BadRequestException(`Hay mas de un turno asignado para el mismo estudiante y fecha en la fila #${index + 1}.`);
      }
      seen.add(key);
    });
  }

  private buildFixedBlockCreates(blocks: RotationFixedBlockDto[]) {
    return blocks.map((block) => ({
      dayOfWeek: block.dayOfWeek,
      startTime: block.startTime,
      endTime: block.endTime,
      serviceId: block.serviceId || null,
      shiftType: block.shiftType || RotationShiftType.CUSTOM,
      notes: block.notes || null,
    }));
  }

  private buildShiftDefinitionCreates(definitions: RotationShiftDefinitionDto[]) {
    return definitions.map((definition) => ({
      name: definition.name.trim(),
      startTime: definition.startTime,
      endTime: definition.endTime,
    }));
  }

  private buildShiftBoardAssignmentCreates(assignments: RotationShiftBoardAssignmentDto[]) {
    return assignments.map((assignment) => ({
      assignmentDate: new Date(assignment.assignmentDate),
      studentId: assignment.studentId,
      shiftDefinitionId: assignment.shiftDefinitionId,
    }));
  }
}