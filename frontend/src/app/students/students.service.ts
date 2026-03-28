import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  document: string;
  email: string;
  phone: string;
  typeId: string;
  institutionId?: string;
  institution?: any;
  type?: any;
  requirements?: any[];
  state: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/students'; 

  getStudents(includeInactive = false): Observable<Student[]> {
    const params = new HttpParams().set('includeInactive', includeInactive ? 'true' : 'false');
    return this.http.get<Student[]>(this.apiUrl, { params });
  }

  getStudent(id: string): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`);
  }

  createStudent(data: any): Observable<Student> {
    return this.http.post<Student>(this.apiUrl, data);
  }

  updateStudent(id: string, data: any): Observable<Student> {
    return this.http.patch<Student>(`${this.apiUrl}/${id}`, data);
  }

  submitRequirement(reqValueId: string, value: string, expiryDate?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/requirements/${reqValueId}/submit`, { value, expiryDate });
  }

  updateStudentState(id: string, state: 'ACTIVE' | 'INACTIVE'): Observable<Student> {
    return this.http.patch<Student>(`${this.apiUrl}/${id}`, { state });
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
