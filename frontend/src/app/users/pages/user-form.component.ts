import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InstitutionService } from '../../institutions/services/institution.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../shared/ui/input/input.component';
import { SelectComponent } from '../../shared/ui/select/select.component';
import { UsersService } from '../users.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
  ],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly institutionsService = inject(InstitutionService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly roleOptions = [
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'INSTITUCION', label: 'Institución' },
  ];

  readonly statusOptions = [
    { value: 'ACTIVE', label: 'Activo' },
    { value: 'BLOCKED', label: 'Bloqueado' },
    { value: 'DISABLED', label: 'Deshabilitado' },
  ];

  institutionOptions: Array<{ value: string; label: string }> = [];
  isSubmitting = false;
  userId: string | null = null;
  isEditMode = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(12)]],
    role: ['HOSPITAL', [Validators.required]],
    institutionId: [''],
    status: ['ACTIVE', [Validators.required]],
  });

  get requiresInstitution() {
    return this.form.get('role')?.value === 'INSTITUCION';
  }

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.userId;

    if (!this.isEditMode) {
      this.form.get('password')?.addValidators([Validators.required]);
      this.form.get('password')?.updateValueAndValidity({ emitEvent: false });
    }

    this.loadInstitutions();
    this.handleRoleChanges();

    if (this.userId) {
      this.loadUser(this.userId);
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const rawValue = this.form.getRawValue();
    const payload = {
      email: rawValue.email,
      ...(rawValue.password ? { password: rawValue.password } : {}),
      role: rawValue.role,
      status: rawValue.status,
      institutionId: rawValue.role === 'INSTITUCION' ? rawValue.institutionId || undefined : undefined,
    };

    const request$ = this.isEditMode && this.userId
      ? this.usersService.updateUser(this.userId, payload)
      : this.usersService.createUser(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.notifications.success(this.isEditMode ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
        void this.router.navigate(['/users']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.notifications.error(error.error?.message || 'No fue posible guardar el usuario.');
      },
    });
  }

  private loadInstitutions() {
    this.institutionsService.getInstitutions(true).subscribe({
      next: (institutions) => {
        this.institutionOptions = institutions.map((institution: any) => ({
          value: institution.id,
          label: institution.name,
        }));
      },
    });
  }

  private loadUser(id: string) {
    this.usersService.getUser(id).subscribe({
      next: (user) => {
        this.form.patchValue({
          email: user.email,
          password: '',
          role: user.role,
          institutionId: user.institutionId || '',
          status: user.status,
        });
      },
      error: (error) => this.notifications.error(error.error?.message || 'No fue posible cargar el usuario.'),
    });
  }

  private handleRoleChanges() {
    const roleControl = this.form.get('role');
    const institutionControl = this.form.get('institutionId');

    const syncInstitutionControl = (role: string | null | undefined) => {
      if (role === 'INSTITUCION') {
        institutionControl?.setValidators([Validators.required]);
      } else {
        institutionControl?.clearValidators();
        institutionControl?.setValue('');
      }

      institutionControl?.updateValueAndValidity({ emitEvent: false });
    };

    syncInstitutionControl(roleControl?.value);
    roleControl?.valueChanges.subscribe((role) => syncInstitutionControl(role));
  }
}