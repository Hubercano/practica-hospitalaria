import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, type AppUserRole } from './auth.service';

export const roleGuard: CanActivateChildFn = (childRoute) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = (childRoute.data?.['roles'] as AppUserRole[] | undefined) || ['HOSPITAL'];

  if (authService.hasAnyRole(roles)) {
    return of(true);
  }

  return of(router.createUrlTree(['/forbidden']));
};