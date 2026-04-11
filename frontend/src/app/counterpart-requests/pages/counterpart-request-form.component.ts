import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CounterpartRequestsService } from '../counterpart-requests.service';
import { InstitutionService } from '../../institutions/services/institution.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { FileUploadComponent } from '../../shared/ui/file-upload/file-upload.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../shared/ui/input/input.component';
import { SelectComponent } from '../../shared/ui/select/select.component';

@Component({
  selector: 'app-counterpart-request-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    FileUploadComponent,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
  ],
  templateUrl: './counterpart-request-form.component.html',
})
export class CounterpartRequestFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly counterpartRequestsService = inject(CounterpartRequestsService);
  private readonly institutionsService = inject(InstitutionService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  institutionOptions: Array<{ value: string; label: string }> = [];
  selectedFile: File | null = null;
  isSubmitting = false;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(3)]],
    institutionId: ['', [Validators.required]],
  });

  ngOnInit() {
    this.institutionsService.getInstitutions(true).subscribe({
      next: (institutions) => {
        this.institutionOptions = institutions.map((institution: any) => ({
          value: institution.id,
          label: institution.name,
        }));
      },
      error: () => this.notifications.error('No fue posible cargar las instituciones.'),
    });
  }

  onFileSelected(file?: File) {
    this.selectedFile = file || null;
  }

  submit() {
    if (this.form.invalid || !this.selectedFile) {
      this.form.markAllAsTouched();
      if (!this.selectedFile) {
        this.notifications.error('Debe adjuntar el archivo xlsx de la contraprestación.');
      }
      return;
    }

    this.isSubmitting = true;
    const raw = this.form.getRawValue();
    const formData = new FormData();
    formData.append('name', raw.name || '');
    formData.append('description', raw.description || '');
    formData.append('institutionId', raw.institutionId || '');
    formData.append('file', this.selectedFile);

    this.counterpartRequestsService.createRequest(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.notifications.success('Contraprestación creada correctamente.');
        void this.router.navigate(['/counterpart-requests']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.notifications.error(error?.error?.message || 'No fue posible crear la contraprestación.');
      },
    });
  }
}