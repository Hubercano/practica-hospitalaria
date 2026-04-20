import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AutoevaluationProcessStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'CLOSED';

export type AutoevaluationActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface AutoevaluationCriterionCatalog {
  id: string;
  name: string;
  description: string | null;
  verificationMechanism?: string | null;
  weight: number;
  orderIndex: number;
}

export interface AutoevaluationFactorCatalog {
  id: string;
  name: string;
  description: string | null;
  orderIndex: number;
  criteria: AutoevaluationCriterionCatalog[];
}

export interface AutoevaluationCatalogResponse {
  factors: AutoevaluationFactorCatalog[];
}

export interface AutoevaluationProcessListItem {
  id: string;
  year: number;
  period: number;
  status: AutoevaluationProcessStatus;
  institution: { id: string; name: string };
  globalScore: number | null;
  compliancePercentage: number | null;
  updatedAt: string;
}

export interface AutoevaluationScore {
  id: string;
  criterionId: string;
  criterionName: string;
  criterionWeight: number;
  factorId: string;
  factorName: string;
  score: number;
  evidence: string | null;
  improvementNotes: string | null;
}

export interface AutoevaluationAction {
  id: string;
  title: string;
  description: string | null;
  responsible: string | null;
  targetDate: string | null;
  progress: number;
  status: AutoevaluationActionStatus;
}

export interface AutoevaluationProcess {
  id: string;
  year: number;
  period: number;
  status: AutoevaluationProcessStatus;
  institution: { id: string; name: string };
  strengths: string | null;
  opportunities: string | null;
  conclusions: string | null;
  globalScore: number | null;
  compliancePercentage: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  scores: AutoevaluationScore[];
  actions: AutoevaluationAction[];
}

export interface OpenAutoevaluationProcessPayload {
  institutionId: string;
  year: number;
  period: number;
  teachingServiceCommitteeId?: string;
}

export interface SaveAutoevaluationScorePayload {
  criterionId: string;
  score: number;
  evidence?: string;
  improvementNotes?: string;
}

export interface SaveAutoevaluationActionPayload {
  id?: string;
  title: string;
  description?: string;
  responsible?: string;
  targetDate?: string;
  progress?: number;
  status?: AutoevaluationActionStatus;
}

export interface SaveAutoevaluationDraftPayload {
  strengths?: string;
  opportunities?: string;
  conclusions?: string;
  scores?: SaveAutoevaluationScorePayload[];
  actions?: SaveAutoevaluationActionPayload[];
}

export interface ReviewAutoevaluationPayload {
  status: Extract<AutoevaluationProcessStatus, 'IN_REVIEW' | 'APPROVED' | 'CLOSED'>;
  reviewNotes?: string;
}

export interface AutoevaluationEvidenceFile {
  id: string;
  scoreId: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  description: string | null;
  uploadedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: string | null;
  performedBy: string;
  performedAt: string;
}

export type AutoevaluationAuditLog = AuditLogEntry;

@Injectable({ providedIn: 'root' })
export class AutoevaluationsService {
  private readonly baseUrl = 'http://localhost:3000/autoevaluations';

  constructor(private readonly http: HttpClient) {}

  getCatalog(): Observable<AutoevaluationCatalogResponse> {
    return this.http.get<AutoevaluationCatalogResponse>(`${this.baseUrl}/catalog`);
  }

  listProcesses(filters: { year?: number; period?: number; institutionId?: string }): Observable<AutoevaluationProcessListItem[]> {
    let params = new HttpParams();

    if (filters.year) {
      params = params.set('year', filters.year);
    }

    if (filters.period) {
      params = params.set('period', filters.period);
    }

    if (filters.institutionId) {
      params = params.set('institutionId', filters.institutionId);
    }

    return this.http.get<AutoevaluationProcessListItem[]>(`${this.baseUrl}/processes`, { params });
  }

  getProcessById(id: string): Observable<AutoevaluationProcess> {
    return this.http.get<AutoevaluationProcess>(`${this.baseUrl}/processes/${id}`);
  }

  openProcess(payload: OpenAutoevaluationProcessPayload): Observable<AutoevaluationProcess> {
    return this.http.post<AutoevaluationProcess>(`${this.baseUrl}/processes`, payload);
  }

  saveDraft(id: string, payload: SaveAutoevaluationDraftPayload): Observable<AutoevaluationProcess> {
    return this.http.put<AutoevaluationProcess>(`${this.baseUrl}/processes/${id}/draft`, payload);
  }

  submitProcess(id: string): Observable<AutoevaluationProcess> {
    return this.http.post<AutoevaluationProcess>(`${this.baseUrl}/processes/${id}/submit`, {});
  }

  reviewProcess(id: string, payload: ReviewAutoevaluationPayload): Observable<AutoevaluationProcess> {
    return this.http.post<AutoevaluationProcess>(`${this.baseUrl}/processes/${id}/review`, payload);
  }

  uploadEvidence(scoreId: string, file: File, description?: string): Observable<AutoevaluationEvidenceFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    return this.http.post<AutoevaluationEvidenceFile>(`${this.baseUrl}/scores/${scoreId}/evidences`, formData);
  }

  getScoreEvidences(scoreId: string): Observable<AutoevaluationEvidenceFile[]> {
    return this.http.get<AutoevaluationEvidenceFile[]>(`${this.baseUrl}/scores/${scoreId}/evidences`);
  }

  deleteEvidence(evidenceId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/evidences/${evidenceId}`);
  }

  getProcessAuditLog(processId: string): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(`${this.baseUrl}/processes/${processId}/audit-log`);
  }
}
