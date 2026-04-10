import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UserRole = 'HOSPITAL' | 'INSTITUCION';
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'DISABLED';

export interface AppUserItem {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  institutionId: string | null;
  institution?: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = 'http://localhost:3000/users';

  constructor(private readonly http: HttpClient) {}

  getUsers(): Observable<AppUserItem[]> {
    return this.http.get<AppUserItem[]>(this.apiUrl);
  }

  getUser(id: string): Observable<AppUserItem> {
    return this.http.get<AppUserItem>(`${this.apiUrl}/${id}`);
  }

  createUser(payload: unknown): Observable<AppUserItem> {
    return this.http.post<AppUserItem>(this.apiUrl, payload);
  }

  updateUser(id: string, payload: unknown): Observable<AppUserItem> {
    return this.http.patch<AppUserItem>(`${this.apiUrl}/${id}`, payload);
  }

  updateStatus(id: string, status: UserStatus): Observable<AppUserItem> {
    return this.http.patch<AppUserItem>(`${this.apiUrl}/${id}/status`, { status });
  }

  resetPassword(id: string, newPassword: string): Observable<AppUserItem> {
    return this.http.post<AppUserItem>(`${this.apiUrl}/${id}/reset-password`, { newPassword });
  }
}