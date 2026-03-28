
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InstitutionService, InstitutionType } from '../../services/institution.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { SelectComponent } from '../../../shared/ui/select/select.component';

@Component({
  selector: 'app-institution-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, CardComponent, FormFieldComponent, InputComponent, SelectComponent],
  templateUrl: './institution-form.component.html',
  styleUrls: ['./institution-form.component.css']
})
export class InstitutionFormComponent implements OnInit {
  form: FormGroup;
  types: InstitutionType[] = [];
  typeOptions: {label: string, value: any}[] = [];
  hasInstitutionTypes = true;
  isSubmitting = false;
  isEdit = false;
  institutionId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private service: InstitutionService,
    private route: ActivatedRoute,
    private router: Router,
    private ns: NotificationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nit: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      typeId: ['', Validators.required],
      address: ['']
    });
  }

  ngOnInit() {
    this.institutionId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.institutionId;

    this.service.getTypes().subscribe({
      next: (data) => {
        this.types = data;
        this.typeOptions = data.map(t => ({ label: t.name, value: t.id }));
        this.hasInstitutionTypes = this.types.length > 0;

        if (this.hasInstitutionTypes) {
          if (!this.isEdit) {
            this.form.patchValue({ typeId: this.types[0].id });
          }
          this.form.get('typeId')?.enable({ emitEvent: false });
        } else {
          this.form.patchValue({ typeId: '' });
          this.form.get('typeId')?.disable({ emitEvent: false });
          this.ns.info('Debes crear al menos un tipo de institución antes de registrar instituciones.');
        }
      },
      error: (err) => {
        this.ns.error('Error al cargar tipos de institución: ' + (err.error?.message || err.message));
      }
    });

    if (this.isEdit && this.institutionId) {
      this.service.getInstitution(this.institutionId).subscribe({
        next: (data) => {
          this.form.patchValue({
            name: data.name ?? '',
            nit: data.nit ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            typeId: data.typeId ?? data.type?.id ?? '',
            address: data.address ?? '',
          });
        },
        error: (err) => {
          this.ns.error('Error al cargar institución: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  get controlErrors() {
    return {
      name: this.form.get('name')?.touched && this.form.get('name')?.errors?.['required'] ? 'El nombre es obligatorio' : null,
      nit: this.form.get('nit')?.touched && this.form.get('nit')?.errors?.['required'] ? 'El NIT es obligatorio' : null,
      email: this.form.get('email')?.touched && this.form.get('email')?.errors?.['required'] ? 'El email es obligatorio' :
             this.form.get('email')?.touched && this.form.get('email')?.errors?.['email'] ? 'Formato de email inv�lido' : null,
      typeId: this.form.get('typeId')?.touched && this.form.get('typeId')?.errors?.['required'] ? 'El tipo es obligatorio' : null
    };
  }

  onSubmit() {
    if (!this.hasInstitutionTypes) {
      this.ns.info('Primero debes crear tipos de institución.');
      return;
    }
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload = this.form.getRawValue();

    if (this.isEdit && this.institutionId) {
      this.service.updateInstitution(this.institutionId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.ns.success('Institución actualizada correctamente');
          this.router.navigate(['/institutions/list']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.ns.error('Error al actualizar: ' + (err.error?.message || err.message));
        }
      });
      return;
    }

    this.service.createInstitution(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/institutions/list']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.ns.error('Error al crear: ' + (err.error?.message || err.message));
      }
    });
  }
}

