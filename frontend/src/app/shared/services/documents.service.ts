import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DocumentReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DocumentVersionSummary {
  id: string;
  versionNumber: number;
  status: DocumentReviewStatus;
  fileUrl?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  textValue?: string | null;
  dateValue?: string | null;
  expiryDate?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  value?: string | null;
}

export interface DocumentHistoryResponse {
  slot: {
    id: string;
    label: string;
    description?: string | null;
    subjectType: string;
    subjectId: string;
    documentType: string;
  };
  versions: DocumentVersionSummary[];
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly apiUrl = 'http://localhost:3000/documents';

  constructor(private readonly http: HttpClient) {}

  submitValue(slotId: string, value: string, expiryDate?: string): Observable<DocumentVersionSummary> {
    return this.http.post<DocumentVersionSummary>(`${this.apiUrl}/slots/${slotId}/submit`, {
      value,
      expiryDate,
    });
  }

  uploadFile(slotId: string, file: File, expiryDate?: string): Observable<DocumentVersionSummary> {
    const formData = new FormData();
    formData.append('file', file);

    if (expiryDate) {
      formData.append('expiryDate', expiryDate);
    }

    return this.http.post<DocumentVersionSummary>(`${this.apiUrl}/slots/${slotId}/upload`, formData);
  }

  review(slotId: string, status: DocumentReviewStatus, rejectionReason?: string): Observable<DocumentVersionSummary> {
    return this.http.patch<DocumentVersionSummary>(`${this.apiUrl}/slots/${slotId}/review`, {
      status,
      rejectionReason,
    });
  }

  reviewVersion(versionId: string, status: DocumentReviewStatus, rejectionReason?: string): Observable<DocumentVersionSummary> {
    return this.http.patch<DocumentVersionSummary>(`${this.apiUrl}/versions/${versionId}/review`, {
      status,
      rejectionReason,
    });
  }

  getHistory(slotId: string): Observable<DocumentHistoryResponse> {
    return this.http.get<DocumentHistoryResponse>(`${this.apiUrl}/slots/${slotId}/history`);
  }
}