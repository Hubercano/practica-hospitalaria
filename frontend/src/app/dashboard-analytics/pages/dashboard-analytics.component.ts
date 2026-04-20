import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, BarController, BarElement } from 'chart.js';
import {
  AnalyticsFilterOptions,
  AnalyticsFilters,
  AnalyticsKpiMetrics,
  AnalyticsService,
  DashboardAnalyticsResponse,
  RankedItem,
  TemporalSeries,
} from '../services/analytics.service';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  BarController,
  BarElement,
);

const SERIES_COLORS = ['#31d4f4', '#3b82f6', '#14b8a6', '#f59e0b', '#a855f7', '#ef4444'];

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './dashboard-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAnalyticsComponent implements AfterViewInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);

  @ViewChild('temporalChart') temporalChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('universitiesChart') universitiesChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teachersChart') teachersChartRef?: ElementRef<HTMLCanvasElement>;

  private temporalChart: Chart | null = null;
  private universitiesChart: Chart | null = null;
  private teachersChart: Chart | null = null;
  private readonly viewReady = signal(false);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly filterOptions = signal<AnalyticsFilterOptions>({
    years: [],
    months: [],
    institutions: [],
    programs: [],
    teachers: [],
  });

  readonly kpis = signal<AnalyticsKpiMetrics>({
    totalRotations: 0,
    assignedStudents: 0,
    totalCapacity: 0,
    occupancyRate: 0,
  });

  readonly temporalSeries = signal<TemporalSeries>({
    labels: this.analyticsService.monthLabels,
    series: [],
  });

  readonly programDistribution = signal<RankedItem[]>([]);
  readonly universitiesRanking = signal<RankedItem[]>([]);
  readonly teachersRanking = signal<RankedItem[]>([]);

  readonly selectedYears = signal<number[]>([]);
  readonly selectedMonths = signal<number[]>([]);
  readonly selectedInstitutionIds = signal<string[]>([]);
  readonly selectedProgramIds = signal<string[]>([]);
  readonly selectedTeacherIds = signal<string[]>([]);

  readonly activeFilters = computed<AnalyticsFilters>(() => ({
    years: this.selectedYears(),
    months: this.selectedMonths(),
    institutionIds: this.selectedInstitutionIds(),
    programIds: this.selectedProgramIds(),
    teacherIds: this.selectedTeacherIds(),
  }));

  readonly leadingTeacher = computed(() => this.teachersRanking()[0] || null);
  readonly leadingTeacherName = computed(() => this.leadingTeacher()?.name || 'Sin datos');
  readonly leadingTeacherValue = computed(() => this.leadingTeacher()?.value || 0);

  readonly monthLabelMap = new Map(this.analyticsService.monthLabels.map((label, index) => [index + 1, label]));
  readonly monthOptions = computed(() =>
    this.filterOptions().months.map((month) => ({
      id: month,
      label: this.monthLabelMap.get(month) || String(month),
    })),
  );

  constructor() {
    this.loadDashboard();

    effect(() => {
      if (!this.viewReady()) {
        return;
      }

      this.renderTemporalChart(this.temporalSeries());
      this.renderRankingCharts(this.universitiesRanking(), this.teachersRanking());
    });
  }

  ngAfterViewInit() {
    this.viewReady.set(true);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  clearFilters() {
    this.selectedYears.set([]);
    this.selectedMonths.set([]);
    this.selectedInstitutionIds.set([]);
    this.selectedProgramIds.set([]);
    this.selectedTeacherIds.set([]);
    this.loadDashboard();
  }

  onYearsChange(values: number[] | null) {
    this.selectedYears.set(values || []);
    this.loadDashboard();
  }

  onMonthsChange(values: number[] | null) {
    this.selectedMonths.set(values || []);
    this.loadDashboard();
  }

  onInstitutionsChange(values: string[] | null) {
    this.selectedInstitutionIds.set(values || []);
    this.loadDashboard();
  }

  onProgramsChange(values: string[] | null) {
    this.selectedProgramIds.set(values || []);
    this.loadDashboard();
  }

  onTeachersChange(values: string[] | null) {
    this.selectedTeacherIds.set(values || []);
    this.loadDashboard();
  }

  trackById(_: number, item: RankedItem) {
    return item.id;
  }

  private loadDashboard() {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.fetchDashboardAnalytics(this.activeFilters()).subscribe({
      next: (response: DashboardAnalyticsResponse) => {
        this.filterOptions.set(response.filterOptions);
        this.kpis.set(response.kpis);
        this.temporalSeries.set(response.temporalSeries);
        this.programDistribution.set(response.distributions.programs || []);
        this.universitiesRanking.set(response.distributions.universities || []);
        this.teachersRanking.set(response.distributions.teachers || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No fue posible cargar la analitica');
        this.loading.set(false);
      },
    });
  }

  private renderTemporalChart(series: TemporalSeries) {
    if (!this.temporalChartRef?.nativeElement) {
      return;
    }

    this.temporalChart?.destroy();

    this.temporalChart = new Chart(this.temporalChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: series.series.map((line, index) => ({
          label: line.year,
          data: line.data,
          borderColor: SERIES_COLORS[index % SERIES_COLORS.length],
          backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length],
          borderWidth: 2,
          fill: false,
          tension: 0.25,
          pointRadius: 3,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#dbeafe' },
          },
        },
        scales: {
          x: {
            ticks: { color: '#cbd5e1' },
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
          },
          y: {
            ticks: { color: '#cbd5e1' },
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            beginAtZero: true,
          },
        },
      },
    });
  }

  private renderRankingCharts(universities: RankedItem[], teachers: RankedItem[]) {
    if (this.universitiesChartRef?.nativeElement) {
      this.universitiesChart?.destroy();
      this.universitiesChart = new Chart(this.universitiesChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: universities.map((item) => item.name),
          datasets: [
            {
              label: 'Rotaciones',
              data: universities.map((item) => item.value),
              backgroundColor: '#22d3ee',
              borderRadius: 6,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              ticks: { color: '#cbd5e1' },
              grid: { color: 'rgba(148, 163, 184, 0.15)' },
            },
            y: {
              ticks: { color: '#cbd5e1' },
              grid: { display: false },
            },
          },
        },
      });
    }

    if (this.teachersChartRef?.nativeElement) {
      this.teachersChart?.destroy();
      this.teachersChart = new Chart(this.teachersChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: teachers.map((item) => item.name),
          datasets: [
            {
              label: 'Rotaciones',
              data: teachers.map((item) => item.value),
              backgroundColor: '#818cf8',
              borderRadius: 6,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              ticks: { color: '#cbd5e1' },
              grid: { color: 'rgba(148, 163, 184, 0.15)' },
            },
            y: {
              ticks: { color: '#cbd5e1' },
              grid: { display: false },
            },
          },
        },
      });
    }
  }

  private destroyCharts() {
    this.temporalChart?.destroy();
    this.universitiesChart?.destroy();
    this.teachersChart?.destroy();
    this.temporalChart = null;
    this.universitiesChart = null;
    this.teachersChart = null;
  }
}
