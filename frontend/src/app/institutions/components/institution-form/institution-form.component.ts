
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
  isSubmitting = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private service: InstitutionService,
    private router: Router,
    private ns: NotificationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nit: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      typeId: [''],
      address: ['']
    });
  }

  ngOnInit() {
    this.service.getTypes().subscribe(data => {
      this.types = data;
      this.typeOptions = data.map(t => ({ label: t.name, value: t.id }));
      if (this.types.length > 0) {
        this.form.patchValue({ typeId: this.types[0].id });
      }
    });
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
    if (this.form.invalid) return;
    this.isSubmitting = true;
    this.service.createInstitution(this.form.value).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.router.navigate(['/institutions']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.ns.error('Error al crear: ' + err.message);
      }
    });
  }
}

