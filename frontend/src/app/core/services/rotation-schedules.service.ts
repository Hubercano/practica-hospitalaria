import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RotationSchedulesService {
  private apiUrl = 'http://localhost:3000/rotation-schedules';
  private institutionsUrl = 'http://localhost:3000/institutions';
  private programsUrl = 'http://localhost:3000/academic-programs';
  private areasUrl = 'http://localhost:3000/rotation-areas';
  private servicesUrl = 'http://localhost:3000/clinical-services';
  private teachersUrl = 'http://localhost:3000/teachers';
  private studentsUrl = 'http://localhost:3000/students';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  create(payload: any) {
    return this.http.post(this.apiUrl, payload);
  }

  update(id: string, payload: any) {
    return this.http.patch(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Helpers to fetch select options
  getInstitutions() { return this.http.get<any[]>(this.institutionsUrl); }
  getPrograms() { return this.http.get<any[]>(this.programsUrl); }
  getAreas() { return this.http.get<any[]>(this.areasUrl); }
  getServices() { return this.http.get<any[]>(this.servicesUrl); }
  getTeachers() { return this.http.get<any[]>(this.teachersUrl); }
  getStudents() { return this.http.get<any[]>(this.studentsUrl); }
}
