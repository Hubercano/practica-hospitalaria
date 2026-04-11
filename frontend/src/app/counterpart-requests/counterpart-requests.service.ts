import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, interval, map, Observable, of, startWith, Subscription, switchMap, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export type CounterpartStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CounterpartRequestItem {
  id: string;
  name: string;
  description: string | null;
  status: CounterpartStatus;
  institutionId: string;
  institution: { id: string; name: string };
  fileUrl: string;
  originalFileName: string;
  createdAt: string;
  respondedAt: string | null;
  values: {
    valueWithoutDiscount: number | null;
    discountPercentage: number | null;
    valueWithDiscount: number | null;
    responseDate: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class CounterpartRequestsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = 'http://localhost:3000/counterpart-requests';
  private pollingSub: Subscription | null = null;
  private readonly unreadCountState = signal(0);

  readonly unreadCount = this.unreadCountState.asReadonly();

  getRequests(markAsSeen = true): Observable<CounterpartRequestItem[]> {
    const params = new HttpParams().set('markAsSeen', markAsSeen ? 'true' : 'false');
    return this.http.get<CounterpartRequestItem[]>(this.apiUrl, { params }).pipe(
      tap(() => {
        if (markAsSeen) {
          this.unreadCountState.set(0);
        }
      }),
    );
  }

  createRequest(formData: FormData): Observable<CounterpartRequestItem> {
    return this.http.post<CounterpartRequestItem>(this.apiUrl, formData);
  }

  approveRequest(requestId: string, payload: {
    valueWithoutDiscount: number;
    discountPercentage: number;
    valueWithDiscount: number;
  }): Observable<CounterpartRequestItem> {
    return this.http.post<CounterpartRequestItem>(`${this.apiUrl}/${requestId}/approve`, payload);
  }

  rejectRequest(requestId: string): Observable<CounterpartRequestItem> {
    return this.http.post<CounterpartRequestItem>(`${this.apiUrl}/${requestId}/reject`, {});
  }

  downloadFile(requestId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/${requestId}/file`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  refreshUnreadCount(): Observable<number> {
    if (!this.authService.isAuthenticated()) {
      this.unreadCountState.set(0);
      return of(0);
    }

    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/notifications/summary`).pipe(
      map((response) => response.unreadCount || 0),
      tap((count) => this.unreadCountState.set(count)),
      catchError(() => {
        this.unreadCountState.set(0);
        return of(0);
      }),
    );
  }

  startPolling() {
    if (this.pollingSub) {
      return;
    }

    this.pollingSub = interval(30000)
      .pipe(startWith(0), switchMap(() => this.refreshUnreadCount()))
      .subscribe();
  }

  stopPolling() {
    this.pollingSub?.unsubscribe();
    this.pollingSub = null;
  }

  clearUnreadCount() {
    this.unreadCountState.set(0);
  }
}