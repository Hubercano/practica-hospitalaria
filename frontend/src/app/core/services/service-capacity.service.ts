import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceCapacity, CreateServiceCapacityDto } from '../models/service-capacity.model';

@Injectable({
  providedIn: 'root'
})
export class ServiceCapacityService {
  private apiUrl = 'http://localhost:3000/service-capacities';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ServiceCapacity[]> {
    return this.http.get<ServiceCapacity[]>(this.apiUrl);
  }

  create(dto: CreateServiceCapacityDto): Observable<ServiceCapacity> {
    return this.http.post<ServiceCapacity>(this.apiUrl, dto);
  }

  getOne(id: string): Observable<ServiceCapacity> {
    return this.http.get<ServiceCapacity>(`${this.apiUrl}/${id}`);
  }

  update(id: string, dto: any): Observable<ServiceCapacity> {
    return this.http.patch<ServiceCapacity>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  
  uploadBulk(formData: FormData) {
    return this.http.post<any>(`${this.apiUrl}/bulk-upload`, formData);
  }
}
