import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const API_BASE_URL = 'http://localhost:3000';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isApiRequest = req.url.startsWith(API_BASE_URL);
    const skipAuth = req.headers.has('X-Skip-Auth');
    const cleanHeaders = req.headers.delete('X-Skip-Auth').delete('X-Skip-Error-Toast');

    let nextReq = req;

    if (isApiRequest) {
      nextReq = req.clone({
        headers: cleanHeaders,
        withCredentials: true,
      });

      const accessToken = this.authService.getAccessToken();
      if (accessToken && !skipAuth) {
        nextReq = nextReq.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    }

    return next.handle(nextReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          !isApiRequest ||
          skipAuth ||
          error.status !== 401 ||
          nextReq.url.includes('/auth/login') ||
          nextReq.url.includes('/auth/refresh')
        ) {
          return throwError(() => error);
        }

        return this.authService.refreshSession().pipe(
          switchMap((session) => {
            if (!session) {
              this.authService.clearSession();
              void this.router.navigate(['/login']);
              return throwError(() => error);
            }

            const refreshedToken = this.authService.getAccessToken();
            const retriedReq = refreshedToken
              ? nextReq.clone({
                  setHeaders: {
                    Authorization: `Bearer ${refreshedToken}`,
                  },
                })
              : nextReq;

            return next.handle(retriedReq);
          }),
          catchError((refreshError) => {
            this.authService.clearSession();
            void this.router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
        );
      }),
    );
  }
}