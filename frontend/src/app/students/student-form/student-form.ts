import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { StudentsService } from '../students.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { HttpClient } from '@angular/common/http';

import { CardComponent } from '../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../shared/ui/input/input.component';
import { SelectComponent } from '../../shared/ui/select/select.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardComponent,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
    ButtonComponent
  ],
  templateUrl: './student-form.html',
  styleUrls: ['./student-form.css']
})
export class StudentForm implements OnInit {
  form: FormGroup;
  isSubmitting = false;

  documentTypeOptions = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PASSPORT', label: 'Pasaporte' }
  ];

  typeOptions: { value: string, label: string }[] = [];

  private fb = inject(FormBuilder);
  private studentsService = inject(StudentsService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private ns = inject(NotificationService);

  constructor() {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      documentType: ['CC', Validators.required],
      document: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      typeId: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadStudentTypes();
  }

  loadStudentTypes() {
    this.http.get<any[]>('http://localhost:3000/student-types').subscribe({
      next: (types) => {
        this.typeOptions = types.map(t => ({
          value: t.id,
          label: t.name
        }));
        if (this.typeOptions.length > 0) {
          this.form.patchValue({ typeId: this.typeOptions[0].value });
        }
      },
      error: (err) => console.error('Error loading student types', err)
    });
  }

  get controlErrors() {
    return {
      firstName: this.form.get('firstName')?.invalid && this.form.get('firstName')?.touched ? 'El nombre es requerido' : null,
      lastName: this.form.get('lastName')?.invalid && this.form.get('lastName')?.touched ? 'El apellido es requerido' : null,
      document: this.form.get('document')?.invalid && this.form.get('document')?.touched ? 'El documento es requerido' : null,
      email: this.form.get('email')?.invalid && this.form.get('email')?.touched ? 'Correo inválido' : null,
    };
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.studentsService.createStudent(this.form.value).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.router.navigate(['/students', res.id]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.ns.error('Error al crear el estudiante: ' + (err.error?.message || err.message));
      }
    });
  }
}
