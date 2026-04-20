import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AnalyticsFilters = {
  years: number[];
  months: number[];
  institutionIds: string[];
  programIds: string[];
  teacherIds: string[];
};

@Injectable()
export class DashboardAnalyticsService {
  private readonly monthLabels = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async getCapacityInstalledAnalytics(rawFilters: {
    years?: string;
    months?: string;
    institutionIds?: string;
    programIds?: string;
    teacherIds?: string;
  }) {
    const filters = this.parseFilters(rawFilters);

    const [
      schedules,
      institutions,
      programs,
      teachers,
      capacities,
    ] = await Promise.all([
      this.prisma.rotationSchedule.findMany({
        select: {
          id: true,
          institutionId: true,
          programId: true,
          teacherIds: true,
          studentIds: true,
          startDate: true,
          endDate: true,
        },
      }),
      this.prisma.institution.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      this.prisma.academicProgram.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      this.prisma.teacher.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, email: true } }),
      this.prisma.serviceCapacity.findMany({ select: { id: true, capacityQuantity: true } }),
    ]);

    const filterOptions = this.buildFilterOptions(schedules, institutions, programs, teachers);
    const filteredSchedules = this.applyFilters(schedules, filters);

    const kpis = this.buildKpis(filteredSchedules, capacities);
    const temporalSeries = this.buildTemporalSeries(filteredSchedules);

    const institutionsMap = new Map(institutions.map((item) => [item.id, item.name]));
    const programsMap = new Map(programs.map((item) => [item.id, item.name]));
    const teachersMap = new Map(
      teachers.map((item) => [item.id, `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || item.id]),
    );

    return {
      filterOptions,
      kpis,
      temporalSeries,
      distributions: {
        programs: this.buildRanking(filteredSchedules, (schedule) => schedule.programId, programsMap, 12),
        universities: this.buildRanking(filteredSchedules, (schedule) => schedule.institutionId, institutionsMap, 10),
        teachers: this.buildTeacherRanking(filteredSchedules, teachersMap, 10),
      },
    };
  }

  private parseFilters(raw: {
    years?: string;
    months?: string;
    institutionIds?: string;
    programIds?: string;
    teacherIds?: string;
  }): AnalyticsFilters {
    return {
      years: this.parseCsvNumbers(raw.years),
      months: this.parseCsvNumbers(raw.months),
      institutionIds: this.parseCsvStrings(raw.institutionIds),
      programIds: this.parseCsvStrings(raw.programIds),
      teacherIds: this.parseCsvStrings(raw.teacherIds),
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

  private buildFilterOptions(
    schedules: Array<{ startDate: Date }>,
    institutions: Array<{ id: string; name: string }>,
    programs: Array<{ id: string; name: string }>,
    teachers: Array<{ id: string; firstName: string; lastName: string; email: string }>,
  ) {
    const years = new Set<number>();
    const months = new Set<number>();

    for (const schedule of schedules) {
      years.add(schedule.startDate.getUTCFullYear());
      months.add(schedule.startDate.getUTCMonth() + 1);
    }

    return {
      years: Array.from(years).sort((a, b) => a - b),
      months: Array.from(months).sort((a, b) => a - b),
      institutions: institutions
        .map((item) => ({ id: item.id, name: item.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      programs: programs
        .map((item) => ({ id: item.id, name: item.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      teachers: teachers
        .map((item) => ({ id: item.id, name: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || item.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  private applyFilters(
    schedules: Array<{
      institutionId: string | null;
      programId: string | null;
      teacherIds: string[];
      studentIds: string[];
      startDate: Date;
    }>,
    filters: AnalyticsFilters,
  ) {
    return schedules.filter((schedule) => {
      const year = schedule.startDate.getUTCFullYear();
      const month = schedule.startDate.getUTCMonth() + 1;

      const yearOk = !filters.years.length || filters.years.includes(year);
      const monthOk = !filters.months.length || filters.months.includes(month);
      const institutionOk = !filters.institutionIds.length || (!!schedule.institutionId && filters.institutionIds.includes(schedule.institutionId));
      const programOk = !filters.programIds.length || (!!schedule.programId && filters.programIds.includes(schedule.programId));
      const teacherOk =
        !filters.teacherIds.length || (Array.isArray(schedule.teacherIds) && schedule.teacherIds.some((id) => filters.teacherIds.includes(id)));

      return yearOk && monthOk && institutionOk && programOk && teacherOk;
    });
  }

  private buildKpis(
    schedules: Array<{ studentIds: string[] }>,
    capacities: Array<{ capacityQuantity: number }>,
  ) {
    const totalRotations = schedules.length;
    const assignedStudents = schedules.reduce((acc, item) => acc + (Array.isArray(item.studentIds) ? item.studentIds.length : 0), 0);
    const totalCapacity = capacities.reduce((acc, item) => acc + Number(item.capacityQuantity || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Number(((assignedStudents / totalCapacity) * 100).toFixed(2)) : 0;

    return {
      totalRotations,
      assignedStudents,
      totalCapacity,
      occupancyRate,
    };
  }

  private buildTemporalSeries(schedules: Array<{ startDate: Date }>) {
    const grouped = new Map<number, number[]>();

    for (const schedule of schedules) {
      const year = schedule.startDate.getUTCFullYear();
      const monthIdx = schedule.startDate.getUTCMonth();

      if (!grouped.has(year)) {
        grouped.set(year, new Array(12).fill(0));
      }

      const row = grouped.get(year) as number[];
      row[monthIdx] += 1;
    }

    const years = Array.from(grouped.keys()).sort((a, b) => a - b);

    return {
      labels: this.monthLabels,
      series: years.map((year) => ({
        year: String(year),
        data: grouped.get(year) as number[],
      })),
    };
  }

  private buildRanking(
    schedules: Array<{ institutionId: string | null; programId: string | null }>,
    resolver: (schedule: { institutionId: string | null; programId: string | null }) => string | null,
    names: Map<string, string>,
    limit: number,
  ) {
    const counter = new Map<string, number>();

    for (const schedule of schedules) {
      const id = resolver(schedule);
      if (!id) {
        continue;
      }

      counter.set(id, (counter.get(id) || 0) + 1);
    }

    return this.toRankedItems(counter, names, limit);
  }

  private buildTeacherRanking(
    schedules: Array<{ teacherIds: string[] }>,
    names: Map<string, string>,
    limit: number,
  ) {
    const counter = new Map<string, number>();

    for (const schedule of schedules) {
      for (const teacherId of schedule.teacherIds || []) {
        counter.set(teacherId, (counter.get(teacherId) || 0) + 1);
      }
    }

    return this.toRankedItems(counter, names, limit);
  }

  private toRankedItems(counter: Map<string, number>, names: Map<string, string>, limit: number) {
    const ordered = Array.from(counter.entries())
      .map(([id, value]) => ({ id, name: names.get(id) || `Sin nombre (${id.slice(0, 6)})`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    const total = ordered.reduce((acc, item) => acc + item.value, 0) || 1;

    return ordered.map((item) => ({
      ...item,
      percent: Number(((item.value / total) * 100).toFixed(2)),
    }));
  }
}