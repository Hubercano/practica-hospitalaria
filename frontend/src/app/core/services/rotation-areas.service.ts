import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RotationArea, CreateRotationAreaDto } from '../models/rotation-area.model';

@Injectable({
  providedIn: 'root'
})
export class RotationAreasService {
  private apiUrl = 'http://localhost:3000/rotation-areas';

  constructor(private http: HttpClient) {}

  getAll(): Observable<RotationArea[]> {
    return this.http.get<RotationArea[]>(this.apiUrl);
  }

  create(dto: CreateRotationAreaDto): Observable<RotationArea> {
    return this.http.post<RotationArea>(this.apiUrl, dto);
  }

  update(id: string, dto: any): Observable<RotationArea> {
    return this.http.put<RotationArea>(`${this.apiUrl}/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
