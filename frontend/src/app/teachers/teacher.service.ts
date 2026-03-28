import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  state?: 'ACTIVE' | 'INACTIVE';
  cvFile?: string;
  dataAuthorizationFile?: string;
  conflictOfInterestFile?: string;
  teacherTrainingFiles?: string[];
  teacherRecognitionFiles?: string[];
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

  updateTeacherState(id: string, state: 'ACTIVE' | 'INACTIVE'): Observable<Teacher> {
    return this.http.patch<Teacher>(`${this.apiUrl}/${id}/state`, { state });
  }

  uploadDocument(id: string, field: string, file: File): Observable<Teacher> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Teacher>(`${this.apiUrl}/${id}/upload/${field}`, formData);
  }

  uploadMultipleDocuments(id: string, field: string, files: File[]): Observable<Teacher> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<Teacher>(`${this.apiUrl}/${id}/upload-multiple/${field}`, formData);
  }

  deleteDocument(id: string, field: string): Observable<Teacher> {
    return this.http.delete<Teacher>(`${this.apiUrl}/${id}/document/${field}`);
  }

  deleteMultipleDocument(id: string, field: string, filePath: string): Observable<Teacher> {
    const params = new HttpParams().set('filePath', filePath);
    return this.http.delete<Teacher>(`${this.apiUrl}/${id}/document-multiple/${field}`, { params });
  }
}