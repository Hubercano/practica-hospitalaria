import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../../shared/notification/notification.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private ns: NotificationService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        let message = 'Ocurrió un error';
        if (err.error?.message) message = err.error.message;
        else if (err.message) message = err.message;
        // map status to friendlier messages when needed
        if (err.status === 0) {
          message = 'No se pudo conectar al servidor. Verifique su conexión.';
        }
        this.ns.error(message);
        return throwError(() => err);
      })
    );
  }
}
