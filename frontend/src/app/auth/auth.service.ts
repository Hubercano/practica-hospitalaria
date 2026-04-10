import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Observable, of, shareReplay, tap, catchError, finalize, map } from 'rxjs';

export type AppUserRole = 'HOSPITAL' | 'INSTITUCION';

export interface AuthUser {
  id: string;
  email: string;
  role: AppUserRole;
  status: string;
  institutionId: string | null;
  institutionName: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

const API_BASE_URL = 'http://localhost:3000';
const AUTH_HEADERS = new HttpHeaders({
  'X-Skip-Auth': 'true',
  'X-Skip-Error-Toast': 'true',
});

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userState = signal<AuthUser | null>(null);
  private readonly initializedState = signal(false);
  private accessToken: string | null = null;
  private refreshRequest$: Observable<AuthResponse | null> | null = null;

  readonly currentUser = this.userState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();

  constructor(private readonly http: HttpClient) {}

  async initialize(): Promise<void> {
    if (this.initializedState()) {
      return;
    }

    await firstValueFrom(this.refreshSession());
    this.initializedState.set(true);
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { headers: AUTH_HEADERS, withCredentials: true },
      )
      .pipe(tap((response) => this.applySession(response)));
  }

  refreshSession(): Observable<AuthResponse | null> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {}, { headers: AUTH_HEADERS, withCredentials: true })
      .pipe(
        tap((response) => this.applySession(response)),
        map((response) => response),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        finalize(() => {
          this.refreshRequest$ = null;
          this.initializedState.set(true);
        }),
        shareReplay(1),
      );

    return this.refreshRequest$;
  }

  logout() {
    return this.http
      .post(`${API_BASE_URL}/auth/logout`, {}, { headers: AUTH_HEADERS, withCredentials: true })
      .pipe(
        tap(() => this.clearSession()),
        catchError(() => {
          this.clearSession();
          return of(void 0);
        }),
      );
  }

  clearSession() {
    this.accessToken = null;
    this.userState.set(null);
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken && !!this.userState();
  }

  hasAnyRole(roles: AppUserRole[]) {
    const user = this.userState();
    if (!user) {
      return false;
    }

    return roles.includes(user.role);
  }

  getHomeRoute() {
    const user = this.userState();
    return user?.role === 'INSTITUCION' ? '/students' : '/institutions/list';
  }

  private applySession(response: AuthResponse) {
    this.accessToken = response.accessToken;
    this.userState.set(response.user);
  }
}