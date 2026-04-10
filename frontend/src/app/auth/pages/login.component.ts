import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '../../shared/notification/notification.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  isSubmitting = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const rawValue = this.form.getRawValue();

    this.authService.login(rawValue.email || '', rawValue.password || '').subscribe({
      next: () => {
        this.isSubmitting = false;
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || this.authService.getHomeRoute();
        void this.router.navigateByUrl(redirectTo);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.notifications.error(error.error?.message || 'No fue posible iniciar sesión.');
      },
    });
  }
}