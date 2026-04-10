import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return of(true);
  }

  return authService.refreshSession().pipe(
    map((session) => {
      if (session) {
        return true;
      }

      return router.createUrlTree(['/login'], {
        queryParams: { redirectTo: state.url },
      });
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree([authService.getHomeRoute()]);
  }

  return authService.refreshSession().pipe(
    switchMap((session) => {
      if (session) {
        return of(router.createUrlTree([authService.getHomeRoute()]));
      }

      return of(true);
    }),
  );
};