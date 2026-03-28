import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AcademicProgram, CreateAcademicProgramDto } from '../models/academic-program.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicProgramsService {
  private apiUrl = 'http://localhost:3000/academic-programs';

  constructor(private http: HttpClient) {}

  getAll(): Observable<AcademicProgram[]> {
    return this.http.get<AcademicProgram[]>(this.apiUrl);
  }

  getOne(id: string): Observable<AcademicProgram> {
    return this.http.get<AcademicProgram>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateAcademicProgramDto): Observable<AcademicProgram> {
    return this.http.post<AcademicProgram>(this.apiUrl, dto);
  }

  update(id: string, dto: Partial<CreateAcademicProgramDto>): Observable<AcademicProgram> {
    return this.http.patch<AcademicProgram>(`${this.apiUrl}/${id}`, dto);
  }

  addRotationArea(programId: string, areaId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${programId}/areas/${areaId}`, {});
  }

  removeRotationArea(programId: string, areaId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${programId}/areas/${areaId}`);
  }
}
