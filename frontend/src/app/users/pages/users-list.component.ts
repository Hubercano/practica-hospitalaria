import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { UsersService, type AppUserItem, type UserStatus } from '../users.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './users-list.component.html',
})
export class UsersListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly users = signal<AppUserItem[]>([]);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.usersService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (error) => this.notifications.error(error.error?.message || 'No fue posible cargar los usuarios.'),
    });
  }

  editUser(user: AppUserItem) {
    void this.router.navigate(['/users', user.id, 'edit']);
  }

  toggleStatus(user: AppUserItem) {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const label = nextStatus === 'ACTIVE' ? 'activar' : 'bloquear';

    if (!confirm(`¿Desea ${label} este usuario?`)) {
      return;
    }

    this.usersService.updateStatus(user.id, nextStatus).subscribe({
      next: () => {
        this.notifications.success(`Usuario ${nextStatus === 'ACTIVE' ? 'activado' : 'bloqueado'} correctamente.`);
        this.loadUsers();
      },
      error: (error) => this.notifications.error(error.error?.message || 'No fue posible actualizar el estado.'),
    });
  }

  resetPassword(user: AppUserItem) {
    const newPassword = window.prompt(`Nueva contraseña para ${user.email}`, 'NuevaClave123!');
    if (!newPassword) {
      return;
    }

    this.usersService.resetPassword(user.id, newPassword).subscribe({
      next: () => this.notifications.success('Contraseña restablecida correctamente.'),
      error: (error) => this.notifications.error(error.error?.message || 'No fue posible restablecer la contraseña.'),
    });
  }
}