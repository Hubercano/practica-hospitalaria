import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, type AppUserRole } from '../auth/auth.service';
import { CounterpartRequestsService } from '../counterpart-requests/counterpart-requests.service';

type MenuItem = {
  label: string;
  route: string;
  roles: AppUserRole[];
  iconPath: string;
  badgeCount?: number;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './private-layout.component.html',
})
export class PrivateLayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly counterpartRequestsService = inject(CounterpartRequestsService);

  readonly currentUser = this.authService.currentUser;
  readonly roleLabel = computed(() => (this.currentUser()?.role === 'INSTITUCION' ? 'Institución' : 'Hospital'));
  readonly initials = computed(() => {
    const email = this.currentUser()?.email || 'AD';
    return email.slice(0, 2).toUpperCase();
  });

  readonly menuGroups = computed<MenuGroup[]>(() => {
    const allGroups: MenuGroup[] = [
      {
        title: 'Módulos',
        items: [
          { label: 'Instituciones', route: '/institutions/list', roles: ['HOSPITAL', 'INSTITUCION'], iconPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
          { label: 'Servicios Clínicos', route: '/clinical-services', roles: ['HOSPITAL'], iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
          { label: 'Capacidad Instalada', route: '/service-capacity', roles: ['HOSPITAL'], iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Programas', route: '/academic-programs', roles: ['HOSPITAL'], iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
          { label: 'Estudiantes', route: '/students', roles: ['HOSPITAL', 'INSTITUCION'], iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
          { label: 'Docentes', route: '/teachers', roles: ['HOSPITAL'], iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { label: 'Programación de Rotaciones', route: '/rotation-schedules', roles: ['HOSPITAL'], iconPath: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z' },
        ],
      },
      {
        title: 'Configuración',
        items: [
          { label: 'Tipos de Institución', route: '/institutions/types', roles: ['HOSPITAL'], iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065' },
          { label: 'Tipos de Estudiantes', route: '/student-types', roles: ['HOSPITAL'], iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065' },
          { label: 'Usuarios', route: '/users', roles: ['HOSPITAL'], iconPath: 'M17 20h5v-1a4 4 0 00-5.356-3.771M9 20H4v-1a4 4 0 015.356-3.771M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        ],
      },
      {
        title: 'Gestión Administrativa',
        items: [
          { label: 'Inducciones', route: '/inductions', roles: ['HOSPITAL'], iconPath: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9m-6-4h6m0 0v6m0-6L10 14' },
          { label: 'Encuestas', route: '/surveys', roles: ['HOSPITAL'], iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          {
            label: 'Contraprestaciones',
            route: '/counterpart-requests',
            roles: ['HOSPITAL', 'INSTITUCION'],
            iconPath: 'M7 8h10M7 12h10m-7 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
            badgeCount: this.counterpartRequestsService.unreadCount(),
          },
        ],
      },
    ];

    return allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => this.authService.hasAnyRole(item.roles)),
      }))
      .filter((group) => group.items.length > 0);
  });

  ngOnInit() {
    this.counterpartRequestsService.startPolling();
  }

  ngOnDestroy() {
    this.counterpartRequestsService.stopPolling();
  }

  logout() {
    this.counterpartRequestsService.stopPolling();
    this.counterpartRequestsService.clearUnreadCount();
    this.authService.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}