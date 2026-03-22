import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StudentType {
  id: string;
  name: string;
  description: string;
  requirements: StudentRequirementDefinition[];
}

export interface StudentRequirementDefinition {
  id?: string;
  studentTypeId?: string;
  name: string;
  description?: string;
  type: 'FILE' | 'TEXT' | 'DATE' | 'NUMBER';
  isRequired: boolean;
  requiresExpiryDate: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudentTypesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/student-types';

  getTypes(): Observable<StudentType[]> {
    return this.http.get<StudentType[]>(this.apiUrl);
  }

  getType(id: string): Observable<StudentType> {
    return this.http.get<StudentType>(`${this.apiUrl}/${id}`);
  }

  createType(data: any): Observable<StudentType> {
    return this.http.post<StudentType>(this.apiUrl, data);
  }

  updateType(id: string, data: any): Observable<StudentType> {
    return this.http.patch<StudentType>(`${this.apiUrl}/${id}`, data);
  }

  deleteType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addRequirement(studentTypeId: string, data: any): Observable<StudentRequirementDefinition> {
    return this.http.post<StudentRequirementDefinition>(`${this.apiUrl}/${studentTypeId}/requirements`, data);
  }

  deleteRequirement(reqId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/requirements/${reqId}`);
  }
}
