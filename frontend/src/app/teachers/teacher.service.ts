import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  document: string;
  email: string;
  phone: string;
  supervisionType: string;
  contractType: string;
  cvFile?: string;
  dataAuthorizationFile?: string;
  conflictOfInterestFile?: string;
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/teachers';

  getTeachers(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(this.apiUrl);
  }

  getTeacher(id: string): Observable<Teacher> {
    return this.http.get<Teacher>(`${this.apiUrl}/${id}`);
  }

  createTeacher(data: any): Observable<Teacher> {
    return this.http.post<Teacher>(this.apiUrl, data);
  }

  updateTeacher(id: string, data: any): Observable<Teacher> {
    return this.http.patch<Teacher>(`${this.apiUrl}/${id}`, data);
  }

  deleteTeacher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadDocument(id: string, field: string, file: File): Observable<Teacher> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Teacher>(`${this.apiUrl}/${id}/upload/${field}`, formData);
  }

  deleteDocument(id: string, field: string): Observable<Teacher> {
    return this.http.delete<Teacher>(`${this.apiUrl}/${id}/document/${field}`);
  }
}