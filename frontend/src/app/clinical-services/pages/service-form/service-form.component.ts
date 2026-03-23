import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ClinicalServicesService } from '../../../core/services/clinical-services.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../../shared/ui/input/input.component';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, CardComponent, FormFieldComponent, InputComponent],
  templateUrl: './service-form.component.html'})
export class ServiceFormComponent implements OnInit {
  serviceForm: FormGroup;
  isSubmitting = false;
  isEditing = false;
  serviceId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private service: ClinicalServicesService,
    private router: Router,
    private route: ActivatedRoute,
    private ns: NotificationService
  ) {
    this.serviceForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      venueName: [''],
      venueSequence: [null],
      venueCode: [''],
      description: [''],
      isActive: [true]
    });
  }

  get controlErrors() {
    return {
      code: this.serviceForm.get('code')?.touched && this.serviceForm.get('code')?.errors?.['required'] ? 'El código es requerido' : null,
      name: this.serviceForm.get('name')?.touched && this.serviceForm.get('name')?.errors?.['required'] ? 'El nombre es requerido' : null,
    };
  }

  ngOnInit() {
    this.serviceId = this.route.snapshot.paramMap.get('id');
    if (this.serviceId) {
      this.isEditing = true;
      this.loadService(this.serviceId);
    }
  }

  loadService(id: string) {
    this.service.getOne(id).subscribe({
      next: (data) => {
        this.serviceForm.patchValue({
          code: data.code,
          name: data.name,
          venueName: data.venueName,
          venueSequence: data.venueSequence,
          venueCode: data.venueCode,
          description: data.description,
          isActive: data.isActive
        });
      },
      error: (err) => {
        console.error(err);
        this.ns.error('Error al cargar el servicio');
        this.router.navigate(['/clinical-services']);
      }
    });
  }

  onSubmit() {
    if (this.serviceForm.valid) {
      this.isSubmitting = true;
      const data = this.serviceForm.value;

      const request$ = this.isEditing && this.serviceId
        ? this.service.update(this.serviceId, data)
        : this.service.create(data);

      request$.subscribe({
        next: () => {
          this.router.navigate(['/clinical-services']);
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
          this.ns.error('Error al guardar el servicio: ' + (err.error?.message || err.message || 'Error desconocido'));
        }
      });
    }
  }
}


