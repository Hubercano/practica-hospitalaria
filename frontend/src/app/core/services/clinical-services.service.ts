import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClinicalService, CreateClinicalServiceDto } from '../models/clinical-service.model';

@Injectable({
  providedIn: 'root'
})
export class ClinicalServicesService {
  private apiUrl = 'http://localhost:3000/clinical-services';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ClinicalService[]> {
    return this.http.get<ClinicalService[]>(this.apiUrl);
  }

  getOne(id: string): Observable<ClinicalService> {
    return this.http.get<ClinicalService>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateClinicalServiceDto): Observable<ClinicalService> {
    return this.http.post<ClinicalService>(this.apiUrl, dto);
  }

  update(id: string, dto: Partial<CreateClinicalServiceDto>): Observable<ClinicalService> {
    return this.http.patch<ClinicalService>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, { responseType: 'blob' as 'blob' });
  }

  uploadBulk(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/bulk-upload`, formData);
  }
}
