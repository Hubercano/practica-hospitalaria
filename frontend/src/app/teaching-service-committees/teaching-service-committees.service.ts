import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type TeachingServiceCommitteeStatus = 'EMPTY' | 'PARTIAL' | 'COMPLETE';

export interface TeachingServiceCommitteeCell {
  id: string | null;
  institutionId: string;
  institutionName: string;
  year: number;
  committeeNumber: number;
  date: string | null;
  time: string | null;
  fileUrl: string | null;
  originalFileName: string | null;
  extraField: string | null;
  hasInfo: boolean;
  hasFile: boolean;
  completionStatus: TeachingServiceCommitteeStatus;
  updatedAt: string | null;
}

export interface TeachingServiceCommitteeRow {
  institutionId: string;
  institutionName: string;
  committees: TeachingServiceCommitteeCell[];
}

export interface TeachingServiceCommitteeMatrix {
  year: number;
  institutions: TeachingServiceCommitteeRow[];
}

@Injectable({ providedIn: 'root' })
export class TeachingServiceCommitteesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/teaching-service-committees';

  getMatrix(year: number): Observable<TeachingServiceCommitteeMatrix> {
    return this.http.get<TeachingServiceCommitteeMatrix>(`${this.apiUrl}?year=${year}`);
  }

  updateCommittee(cell: TeachingServiceCommitteeCell, payload: { date: string | null; time: string | null; extraField: string | null }) {
    return this.http.put<TeachingServiceCommitteeCell>(
      `${this.apiUrl}/${cell.year}/${cell.institutionId}/${cell.committeeNumber}`,
      payload,
    );
  }

  uploadFile(cell: TeachingServiceCommitteeCell, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TeachingServiceCommitteeCell>(
      `${this.apiUrl}/${cell.year}/${cell.institutionId}/${cell.committeeNumber}/file`,
      formData,
    );
  }
}