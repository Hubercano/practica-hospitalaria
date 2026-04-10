import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div class="max-w-lg w-full rounded-3xl bg-white shadow-xl border border-slate-200 p-10 text-center">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Acceso denegado</p>
        <h1 class="mt-3 text-3xl font-semibold text-slate-900">No tienes permisos para esta sección</h1>
        <p class="mt-3 text-sm text-slate-600">Tu sesión está activa, pero tu rol no tiene acceso a la ruta solicitada.</p>
        <div class="mt-8 flex justify-center gap-3">
          <a [routerLink]="authService.getHomeRoute()" class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">Volver al inicio</a>
          <button type="button" (click)="logout()" class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700">Cerrar sesión</button>
        </div>
      </div>
    </div>
  `,
})
export class ForbiddenComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout() {
    this.authService.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}