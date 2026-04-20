import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  CapacityAnalysisFilterOptions,
  CapacityAnalysisFilters,
  CapacityAnalysisResponse,
  CapacityAnalysisService,
  CapacityGroupOccupancy,
  CapacityMatrixRow,
  CapacityProgramOccupancy,
} from '../services/capacity-analysis.service';

@Component({
  selector: 'app-capacity-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './capacity-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapacityAnalysisComponent {
  private readonly service = inject(CapacityAnalysisService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly response = signal<CapacityAnalysisResponse | null>(null);

  readonly filterOptions = signal<CapacityAnalysisFilterOptions>({
    years: [],
    months: [],
    institutions: [],
    programs: [],
    capacityGroups: [],
  });

  readonly selectedYears = signal<number[]>([]);
  readonly selectedMonths = signal<number[]>([]);
  readonly selectedInstitutionIds = signal<string[]>([]);
  readonly selectedProgramIds = signal<string[]>([]);
  readonly selectedCapacityGroups = signal<string[]>([]);

  readonly activeFilters = computed<CapacityAnalysisFilters>(() => ({
    years: this.selectedYears(),
    months: this.selectedMonths(),
    institutionIds: this.selectedInstitutionIds(),
    programIds: this.selectedProgramIds(),
    capacityGroups: this.selectedCapacityGroups(),
  }));

  readonly summary = computed(() =>
    this.response()?.summary ?? {
      analyzedPrograms: 0,
      analyzedGroups: 0,
      totalInstalledCapacity: 0,
      totalAssignedStudents: 0,
      overallOccupancyRate: 0,
    },
  );

  readonly groupOccupancy = computed<CapacityGroupOccupancy[]>(() => this.response()?.groupOccupancy ?? []);
  readonly programOccupancy = computed<CapacityProgramOccupancy[]>(() => this.response()?.programOccupancy ?? []);
  readonly matrix = computed<CapacityMatrixRow[]>(() => this.response()?.matrix ?? []);
  readonly methodology = computed(
    () =>
      this.response()?.methodology ?? {
        normativeCriteria: [],
        calculationNotes: [],
        currentDataLimitations: [],
      },
  );

  readonly monthLabelMap = new Map([
    [1, 'Enero'],
    [2, 'Febrero'],
    [3, 'Marzo'],
    [4, 'Abril'],
    [5, 'Mayo'],
    [6, 'Junio'],
    [7, 'Julio'],
    [8, 'Agosto'],
    [9, 'Septiembre'],
    [10, 'Octubre'],
    [11, 'Noviembre'],
    [12, 'Diciembre'],
  ]);

  readonly monthOptions = computed(() =>
    this.filterOptions().months.map((month) => ({ id: month, label: this.monthLabelMap.get(month) || String(month) })),
  );

  constructor() {
    this.loadReport();
  }

  clearFilters() {
    this.selectedYears.set([]);
    this.selectedMonths.set([]);
    this.selectedInstitutionIds.set([]);
    this.selectedProgramIds.set([]);
    this.selectedCapacityGroups.set([]);
    this.loadReport();
  }

  onYearsChange(values: number[] | null) {
    this.selectedYears.set(values || []);
    this.loadReport();
  }

  onMonthsChange(values: number[] | null) {
    this.selectedMonths.set(values || []);
    this.loadReport();
  }

  onInstitutionsChange(values: string[] | null) {
    this.selectedInstitutionIds.set(values || []);
    this.loadReport();
  }

  onProgramsChange(values: string[] | null) {
    this.selectedProgramIds.set(values || []);
    this.loadReport();
  }

  onGroupsChange(values: string[] | null) {
    this.selectedCapacityGroups.set(values || []);
    this.loadReport();
  }

  trackByGroup(_: number, item: CapacityGroupOccupancy) {
    return item.groupName;
  }

  trackByProgram(_: number, item: CapacityProgramOccupancy) {
    return item.programId;
  }

  trackByMatrix(_: number, item: CapacityMatrixRow) {
    return `${item.programId}-${item.groupName}`;
  }

  private loadReport() {
    this.loading.set(true);
    this.error.set(null);

    this.service.fetchReport(this.activeFilters()).subscribe({
      next: (response) => {
        this.response.set(response);
        this.filterOptions.set(response.filterOptions);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No fue posible cargar el análisis de capacidad instalada.');
        this.loading.set(false);
      },
    });
  }
}
