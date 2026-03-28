// src/app/institutions/services/institution.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Requirement {
  id: string;
  name: string;
  description: string;
  type: 'FILE' | 'TEXT' | 'DATE' | 'NUMBER';
  isRequired: boolean;
  requiresExpiryDate: boolean;
}

export interface InstitutionType {
  id: string;
  name: string;
  description: string;
  requirements: Requirement[];
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstitutionService {
  private apiUrl = 'http://localhost:3000/institutions'; // Check port

  constructor(private http: HttpClient) { }

  getTypes(): Observable<InstitutionType[]> {
    return this.http.get<InstitutionType[]>(`${this.apiUrl}/types`);
  }

  getType(id: string): Observable<InstitutionType> {
    return this.http.get<InstitutionType>(`${this.apiUrl}/types/${id}`);
  }

  createType(data: { name: string, description: string }): Observable<InstitutionType> {
    return this.http.post<InstitutionType>(`${this.apiUrl}/types`, data);
  }

  updateType(id: string, data: { name: string, description: string }): Observable<InstitutionType> {
    return this.http.patch<InstitutionType>(`${this.apiUrl}/types/${id}`, data);
  }

  addRequirement(typeId: string, data: any): Observable<Requirement> {
    return this.http.post<Requirement>(`${this.apiUrl}/types/${typeId}/requirements`, data);
  }

  deleteType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/types/${id}`);
  }

  deleteInstitution(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteRequirement(requirementId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/requirements/${requirementId}`);
  }

  createInstitution(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  updateInstitution(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  updateInstitutionState(id: string, state: 'ACTIVE' | 'INACTIVE'): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/state`, { state });
  }

  getInstitutions(includeInactive = false): Observable<any[]> {
    const params = new HttpParams().set('includeInactive', includeInactive ? 'true' : 'false');
    return this.http.get<any[]>(`${this.apiUrl}`, { params });
  }

  getInstitution(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  submitRequirement(reqValueId: string, value: string, expiryDate?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/requirements/${reqValueId}/submit`, { value, expiryDate });
  }

  downloadTemplate() {
    return this.http.get(`${this.apiUrl}/template`, { responseType: 'blob' });
  }

  uploadBulk(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/bulk-upload`, formData);
  }
}