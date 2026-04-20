import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CapacityAnalysisInstitutionOption {
  id: string;
  name: string;
}

export interface CapacityAnalysisProgramOption {
  id: string;
  name: string;
}

export interface CapacityAnalysisFilterOptions {
  years: number[];
  months: number[];
  institutions: CapacityAnalysisInstitutionOption[];
  programs: CapacityAnalysisProgramOption[];
  capacityGroups: string[];
}

export interface CapacityAnalysisSummary {
  analyzedPrograms: number;
  analyzedGroups: number;
  totalInstalledCapacity: number;
  totalAssignedStudents: number;
  overallOccupancyRate: number;
}

export interface CapacityGroupOccupancy {
  groupName: string;
  installedCapacity: number;
  assignedStudents: number;
  occupancyRate: number;
  servicesCount: number;
}

export interface CapacityProgramOccupancy {
  programId: string;
  programName: string;
  institutionName: string;
  level: string;
  installedCapacity: number;
  assignedStudents: number;
  occupancyRate: number;
}

export interface CapacityMatrixRow {
  programId: string;
  programName: string;
  institutionName: string;
  level: string;
  groupName: string;
  installedCapacity: number;
  assignedStudents: number;
  occupancyRate: number;
  servicesCount: number;
}

export interface CapacityAnalysisMethodology {
  normativeCriteria: string[];
  calculationNotes: string[];
  currentDataLimitations: string[];
}

export interface CapacityAnalysisResponse {
  filterOptions: CapacityAnalysisFilterOptions;
  summary: CapacityAnalysisSummary;
  groupOccupancy: CapacityGroupOccupancy[];
  programOccupancy: CapacityProgramOccupancy[];
  matrix: CapacityMatrixRow[];
  methodology: CapacityAnalysisMethodology;
}

export interface CapacityAnalysisFilters {
  years: number[];
  months: number[];
  institutionIds: string[];
  programIds: string[];
  capacityGroups: string[];
}

@Injectable({ providedIn: 'root' })
export class CapacityAnalysisService {
  private readonly baseUrl = 'http://localhost:3000/capacity-analysis/report';

  constructor(private readonly http: HttpClient) {}

  fetchReport(filters: CapacityAnalysisFilters): Observable<CapacityAnalysisResponse> {
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
    if (filters.capacityGroups.length) {
      params = params.set('capacityGroups', filters.capacityGroups.join(','));
    }

    return this.http.get<CapacityAnalysisResponse>(this.baseUrl, { params });
  }
}
