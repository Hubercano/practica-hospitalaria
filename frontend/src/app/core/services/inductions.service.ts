import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type InductionValidityCode = 'THREE_MONTHS' | 'SIX_MONTHS' | 'ONE_YEAR' | 'ONE_YEAR_SIX_MONTHS' | 'TWO_YEARS';

export interface InductionStudentSummary {
  id: string;
  document: string;
  source: string;
  studentId?: string | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    document: string;
  } | null;
}

export interface Induction {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  inductionDate: string;
  expiryDate: string;
  validityCode: InductionValidityCode;
  validityLabel: string;
  validityMonths: number;
  studentCount: number;
  publicSlug: string;
  publicUrl: string;
  createdAt: string;
  students?: InductionStudentSummary[];
}

@Injectable({ providedIn: 'root' })
export class InductionsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/inductions';
  private publicApiUrl = 'http://localhost:3000/public/inductions';

  getAll(): Observable<Induction[]> {
    return this.http.get<Induction[]>(this.apiUrl);
  }

  getOne(id: string): Observable<Induction> {
    return this.http.get<Induction>(`${this.apiUrl}/${id}`);
  }

  create(payload: {
    name: string;
    inductionDate: string;
    validityCode: InductionValidityCode;
    studentIds: string[];
  }): Observable<Induction> {
    return this.http.post<Induction>(this.apiUrl, payload);
  }

  update(id: string, payload: Partial<{ name: string; inductionDate: string; validityCode: InductionValidityCode; studentIds: string[]; }>): Observable<Induction> {
    return this.http.patch<Induction>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: string): Observable<Induction> {
    return this.http.delete<Induction>(`${this.apiUrl}/${id}`);
  }

  getPermanentLink(id: string): Observable<{ publicSlug: string; url: string }> {
    return this.http.get<{ publicSlug: string; url: string }>(`${this.apiUrl}/${id}/link`);
  }

  publicGetAccess(token: string): Observable<any> {
    return this.http.get(`${this.publicApiUrl}/access/${token}`);
  }

  publicVerifyDocument(token: string, document: string): Observable<any> {
    return this.http.post(`${this.publicApiUrl}/access/${token}/verify-document`, { document });
  }

  publicAttend(token: string, document: string): Observable<any> {
    return this.http.post(`${this.publicApiUrl}/access/${token}/attend`, { document });
  }
}
