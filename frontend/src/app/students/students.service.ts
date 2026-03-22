import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  type?: any;
  requirements?: any[];
  state: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/students'; 

  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(this.apiUrl);
  }

  getStudent(id: string): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`);
  }

  createStudent(data: any): Observable<Student> {
    return this.http.post<Student>(this.apiUrl, data);
  }

  submitRequirement(reqValueId: string, value: string, expiryDate?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/requirements/${reqValueId}/submit`, { value, expiryDate });
  }

  deleteStudent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
