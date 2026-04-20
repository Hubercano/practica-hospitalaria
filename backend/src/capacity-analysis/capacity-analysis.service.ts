import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CapacityAnalysisFilters = {
  years: number[];
  months: number[];
  institutionIds: string[];
  programIds: string[];
  capacityGroups: string[];
};

type AreaRecord = {
  id: string;
  programId: string | null;
  serviceIds: string[];
  services: Array<{ id: string; name: string; code: string }>;
};

type ScheduleRecord = {
  id: string;
  institutionId: string | null;
  programId: string | null;
  areaId: string | null;
  startDate: Date;
  endDate: Date;
  studentIds: string[];
};

type CapacityRecord = {
  id: string;
  capacityGroup: string | null;
  capacityQuantity: number;
  concept: string | null;
  headquartersName: string;
  services: Array<{ id: string; name: string; code: string }>;
};

@Injectable()
export class CapacityAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(rawFilters: {
    years?: string;
    months?: string;
    institutionIds?: string;
    programIds?: string;
    capacityGroups?: string;
  }) {
    const filters = this.parseFilters(rawFilters);

    const [programs, institutions, areas, schedules, capacities] = await Promise.all([
      this.prisma.academicProgram.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          level: true,
          institutionId: true,
          institution: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.institution.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.rotationArea.findMany({
        where: { state: 'ACTIVE' },
        select: {
          id: true,
          programId: true,
          serviceIds: true,
          services: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.rotationSchedule.findMany({
        select: {
          id: true,
          institutionId: true,
          programId: true,
          areaId: true,
          startDate: true,
          endDate: true,
          studentIds: true,
        },
      }),
      this.prisma.serviceCapacity.findMany({
        select: {
          id: true,
          capacityGroup: true,
          capacityQuantity: true,
          concept: true,
          headquartersName: true,
          services: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const filterOptions = this.buildFilterOptions({ schedules, institutions, programs, capacities });

    const selectedPrograms = programs.filter((program) => {
      const institutionOk = !filters.institutionIds.length || (!!program.institutionId && filters.institutionIds.includes(program.institutionId));
      const programOk = !filters.programIds.length || filters.programIds.includes(program.id);
      return institutionOk && programOk;
    });

    const selectedProgramIds = new Set(selectedPrograms.map((program) => program.id));
    const normalizedAreas = areas
      .filter((area) => !!area.programId && selectedProgramIds.has(area.programId))
      .map((area) => ({
        id: area.id,
        programId: area.programId,
        serviceIds: Array.from(new Set([...(area.serviceIds || []), ...area.services.map((service) => service.id)])),
        services: area.services,
      })) as AreaRecord[];

    const areaById = new Map(normalizedAreas.map((area) => [area.id, area]));
    const capacitiesByServiceId = new Map<string, CapacityRecord[]>();

    for (const capacity of capacities as CapacityRecord[]) {
      for (const service of capacity.services) {
        const bucket = capacitiesByServiceId.get(service.id) ?? [];
        bucket.push(capacity as CapacityRecord);
        capacitiesByServiceId.set(service.id, bucket);
      }
    }

    const filteredSchedules = (schedules as ScheduleRecord[]).filter((schedule) => {
      if (!schedule.programId || !selectedProgramIds.has(schedule.programId)) {
        return false;
      }

      if (filters.institutionIds.length && (!schedule.institutionId || !filters.institutionIds.includes(schedule.institutionId))) {
        return false;
      }

      if (!this.scheduleMatchesPeriod(schedule, filters)) {
        return false;
      }

      return true;
    });

    const globalCapacityIds = new Set<string>();
    const groupCapacityIds = new Map<string, Set<string>>();
    const groupServices = new Map<string, Set<string>>();
    const groupInstalledCapacity = new Map<string, number>();
    const groupAssignedStudents = new Map<string, number>();

    const programInstalledCapacity = new Map<string, number>();
    const programAssignedStudents = new Map<string, number>();
    const programCapacityIds = new Map<string, Set<string>>();

    const matrixInstalledCapacity = new Map<string, number>();
    const matrixAssignedStudents = new Map<string, number>();
    const matrixCapacityIds = new Map<string, Set<string>>();
    const matrixServices = new Map<string, Set<string>>();

    for (const program of selectedPrograms) {
      const programAreas = normalizedAreas.filter((area) => area.programId === program.id);
      const capacityIdsForProgram = new Set<string>();
      let totalInstalled = 0;

      for (const area of programAreas) {
        for (const serviceId of area.serviceIds) {
          const linkedCapacities = capacitiesByServiceId.get(serviceId) ?? [];

          for (const capacity of linkedCapacities) {
            const groupName = capacity.capacityGroup?.trim() || 'Sin grupo';
            if (filters.capacityGroups.length && !filters.capacityGroups.includes(groupName)) {
              continue;
            }

            globalCapacityIds.add(capacity.id);

            if (!capacityIdsForProgram.has(capacity.id)) {
              capacityIdsForProgram.add(capacity.id);
              totalInstalled += Number(capacity.capacityQuantity || 0);
            }

            const groupCapacityIdSet = groupCapacityIds.get(groupName) ?? new Set<string>();
            if (!groupCapacityIdSet.has(capacity.id)) {
              groupCapacityIdSet.add(capacity.id);
              groupInstalledCapacity.set(groupName, (groupInstalledCapacity.get(groupName) || 0) + Number(capacity.capacityQuantity || 0));
            }
            groupCapacityIds.set(groupName, groupCapacityIdSet);

            const groupServiceSet = groupServices.get(groupName) ?? new Set<string>();
            groupServiceSet.add(serviceId);
            groupServices.set(groupName, groupServiceSet);

            const matrixKey = `${program.id}::${groupName}`;
            const matrixCapacityIdSet = matrixCapacityIds.get(matrixKey) ?? new Set<string>();
            if (!matrixCapacityIdSet.has(capacity.id)) {
              matrixCapacityIdSet.add(capacity.id);
              matrixInstalledCapacity.set(matrixKey, (matrixInstalledCapacity.get(matrixKey) || 0) + Number(capacity.capacityQuantity || 0));
            }
            matrixCapacityIds.set(matrixKey, matrixCapacityIdSet);

            const matrixServiceSet = matrixServices.get(matrixKey) ?? new Set<string>();
            matrixServiceSet.add(serviceId);
            matrixServices.set(matrixKey, matrixServiceSet);
          }
        }
      }

      programCapacityIds.set(program.id, capacityIdsForProgram);
      programInstalledCapacity.set(program.id, totalInstalled);
    }

    for (const schedule of filteredSchedules) {
      if (!schedule.programId) {
        continue;
      }

      const studentCount = Array.isArray(schedule.studentIds) ? schedule.studentIds.length : 0;
      programAssignedStudents.set(schedule.programId, (programAssignedStudents.get(schedule.programId) || 0) + studentCount);

      const area = schedule.areaId ? areaById.get(schedule.areaId) : undefined;
      if (!area) {
        continue;
      }

      const scheduleGroups = new Set<string>();
      for (const serviceId of area.serviceIds) {
        const linkedCapacities = capacitiesByServiceId.get(serviceId) ?? [];
        for (const capacity of linkedCapacities) {
          const groupName = capacity.capacityGroup?.trim() || 'Sin grupo';
          if (filters.capacityGroups.length && !filters.capacityGroups.includes(groupName)) {
            continue;
          }
          scheduleGroups.add(groupName);
        }
      }

      for (const groupName of scheduleGroups) {
        groupAssignedStudents.set(groupName, (groupAssignedStudents.get(groupName) || 0) + studentCount);
        const matrixKey = `${schedule.programId}::${groupName}`;
        matrixAssignedStudents.set(matrixKey, (matrixAssignedStudents.get(matrixKey) || 0) + studentCount);
      }
    }

    const programOccupancy = selectedPrograms
      .map((program) => {
        const installedCapacity = programInstalledCapacity.get(program.id) || 0;
        const assignedStudents = programAssignedStudents.get(program.id) || 0;
        return {
          programId: program.id,
          programName: program.name,
          level: program.level,
          institutionName: program.institution?.name || 'Sin institución',
          installedCapacity,
          assignedStudents,
          occupancyRate: installedCapacity > 0 ? Number(((assignedStudents / installedCapacity) * 100).toFixed(2)) : 0,
        };
      })
      .filter((item) => item.installedCapacity > 0 || item.assignedStudents > 0)
      .sort((a, b) => b.occupancyRate - a.occupancyRate || a.programName.localeCompare(b.programName));

    const groupOccupancy = Array.from(groupInstalledCapacity.entries())
      .map(([groupName, installedCapacity]) => {
        const assignedStudents = groupAssignedStudents.get(groupName) || 0;
        return {
          groupName,
          installedCapacity,
          assignedStudents,
          occupancyRate: installedCapacity > 0 ? Number(((assignedStudents / installedCapacity) * 100).toFixed(2)) : 0,
          servicesCount: (groupServices.get(groupName) || new Set()).size,
        };
      })
      .sort((a, b) => b.occupancyRate - a.occupancyRate || a.groupName.localeCompare(b.groupName));

    const matrix = Array.from(matrixInstalledCapacity.entries())
      .map(([key, installedCapacity]) => {
        const [programId, groupName] = key.split('::');
        const program = selectedPrograms.find((item) => item.id === programId);
        const assignedStudents = matrixAssignedStudents.get(key) || 0;
        return {
          programId,
          programName: program?.name || 'Programa no identificado',
          institutionName: program?.institution?.name || 'Sin institución',
          level: program?.level || 'Sin nivel',
          groupName,
          installedCapacity,
          assignedStudents,
          occupancyRate: installedCapacity > 0 ? Number(((assignedStudents / installedCapacity) * 100).toFixed(2)) : 0,
          servicesCount: (matrixServices.get(key) || new Set()).size,
        };
      })
      .filter((item) => item.installedCapacity > 0 || item.assignedStudents > 0)
      .sort((a, b) => b.occupancyRate - a.occupancyRate || a.programName.localeCompare(b.programName) || a.groupName.localeCompare(b.groupName));

    const totalInstalledCapacity = Array.from(globalCapacityIds)
      .map((capacityId) => (capacities as CapacityRecord[]).find((capacity) => capacity.id === capacityId))
      .filter((capacity): capacity is CapacityRecord => !!capacity)
      .reduce((acc, capacity) => acc + Number(capacity.capacityQuantity || 0), 0);

    const totalAssignedStudents = filteredSchedules.reduce(
      (acc, schedule) => acc + (Array.isArray(schedule.studentIds) ? schedule.studentIds.length : 0),
      0,
    );

    return {
      filterOptions,
      summary: {
        analyzedPrograms: programOccupancy.length,
        analyzedGroups: groupOccupancy.length,
        totalInstalledCapacity,
        totalAssignedStudents,
        overallOccupancyRate: totalInstalledCapacity > 0 ? Number(((totalAssignedStudents / totalInstalledCapacity) * 100).toFixed(2)) : 0,
      },
      groupOccupancy,
      programOccupancy,
      matrix,
      methodology: {
        normativeCriteria: [
          'Capacidad instalada suficiente del escenario de práctica.',
          'Planeación por programa académico y por servicio/proceso utilizado.',
          'Seguimiento al número de estudiantes en práctica simultánea.',
          'Monitoreo continuo cuando cambian camas, tecnología, dotación o servicios habilitados.',
        ],
        calculationNotes: [
          'La oferta se calcula con los registros del módulo de capacidad instalada asociados a los servicios clínicos.',
          'La demanda se calcula con los estudiantes asignados en programaciones de rotación que se traslapan con el período filtrado.',
          'La ocupación por programa y grupo se obtiene con la fórmula: estudiantes asignados / capacidad instalada del grupo.',
          'La relación entre programa y grupo se deriva de las áreas de rotación y sus servicios asociados.',
        ],
        currentDataLimitations: [
          'El modelo actual no registra jornada de práctica (mañana, tarde, noche), por lo que el cálculo es agregado por período.',
          'El sistema aún no incorpora producción asistencial ni conteo de procedimientos para afinar el cupo normativo por servicio.',
          'La disponibilidad docente y los niveles de supervisión no están modelados para ponderar la capacidad real.',
        ],
      },
    };
  }

  private buildFilterOptions(input: {
    schedules: ScheduleRecord[];
    institutions: Array<{ id: string; name: string }>;
    programs: Array<{ id: string; name: string }>;
    capacities: CapacityRecord[];
  }) {
    const years = new Set<number>();
    const months = new Set<number>();

    for (const schedule of input.schedules) {
      let cursor = new Date(Date.UTC(schedule.startDate.getUTCFullYear(), schedule.startDate.getUTCMonth(), 1));
      const end = new Date(Date.UTC(schedule.endDate.getUTCFullYear(), schedule.endDate.getUTCMonth(), 1));

      while (cursor <= end) {
        years.add(cursor.getUTCFullYear());
        months.add(cursor.getUTCMonth() + 1);
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      }
    }

    const capacityGroups = Array.from(
      new Set(input.capacities.map((capacity) => capacity.capacityGroup?.trim() || 'Sin grupo')),
    ).sort((a, b) => a.localeCompare(b));

    return {
      years: Array.from(years).sort((a, b) => a - b),
      months: Array.from(months).sort((a, b) => a - b),
      institutions: input.institutions,
      programs: input.programs,
      capacityGroups,
    };
  }

  private parseFilters(raw: {
    years?: string;
    months?: string;
    institutionIds?: string;
    programIds?: string;
    capacityGroups?: string;
  }): CapacityAnalysisFilters {
    return {
      years: this.parseCsvNumbers(raw.years),
      months: this.parseCsvNumbers(raw.months),
      institutionIds: this.parseCsvStrings(raw.institutionIds),
      programIds: this.parseCsvStrings(raw.programIds),
      capacityGroups: this.parseCsvStrings(raw.capacityGroups),
    };
  }

  private parseCsvNumbers(value?: string): number[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item));
  }

  private parseCsvStrings(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private scheduleMatchesPeriod(schedule: ScheduleRecord, filters: CapacityAnalysisFilters) {
    if (!filters.years.length && !filters.months.length) {
      return true;
    }

    let cursor = new Date(Date.UTC(schedule.startDate.getUTCFullYear(), schedule.startDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(schedule.endDate.getUTCFullYear(), schedule.endDate.getUTCMonth(), 1));

    while (cursor <= end) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      const yearOk = !filters.years.length || filters.years.includes(year);
      const monthOk = !filters.months.length || filters.months.includes(month);
      if (yearOk && monthOk) {
        return true;
      }
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    return false;
  }
}
