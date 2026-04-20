import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalyticsInstitution {
  id: string;
  name: string;
}

export interface AnalyticsProgram {
  id: string;
  name: string;
}

export interface AnalyticsTeacher {
  id: string;
  name: string;
}

export interface AnalyticsFilters {
  years: number[];
  months: number[];
  institutionIds: string[];
  programIds: string[];
  teacherIds: string[];
}

export interface AnalyticsFilterOptions {
  years: number[];
  months: number[];
  institutions: AnalyticsInstitution[];
  programs: AnalyticsProgram[];
  teachers: AnalyticsTeacher[];
}

export interface AnalyticsKpiMetrics {
  totalRotations: number;
  assignedStudents: number;
  totalCapacity: number;
  occupancyRate: number;
}

export interface TemporalSeries {
  labels: string[];
  series: Array<{ year: string; data: number[] }>;
}

export interface RankedItem {
  id: string;
  name: string;
  value: number;
  percent: number;
}

export interface DashboardAnalyticsResponse {
  filterOptions: AnalyticsFilterOptions;
  kpis: AnalyticsKpiMetrics;
  temporalSeries: TemporalSeries;
  distributions: {
    programs: RankedItem[];
    universities: RankedItem[];
    teachers: RankedItem[];
  };
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly analyticsUrl = 'http://localhost:3000/dashboard-analytics/capacity-installed';

  readonly monthLabels = [
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

  constructor(private readonly http: HttpClient) {}

  fetchDashboardAnalytics(filters: AnalyticsFilters): Observable<DashboardAnalyticsResponse> {
    let params = new HttpParams();

    if (filters.years.length) {
      params = params.set('years', filters.years.join(','));
    }
    if (filters.months.length) {
      params = params.set('months', filters.months.join(','));
    }
    if (filters.institutionIds.length) {
      params = params.set('institutionIds', filters.institutionIds.join(','));
    }
    if (filters.programIds.length) {
      params = params.set('programIds', filters.programIds.join(','));
    }
    if (filters.teacherIds.length) {
      params = params.set('teacherIds', filters.teacherIds.join(','));
    }

    return this.http.get<DashboardAnalyticsResponse>(this.analyticsUrl, { params });
  }
}
