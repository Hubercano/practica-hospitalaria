import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentsService } from '../students.service';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { HttpClient } from '@angular/common/http';
import { InstitutionService } from '../../institutions/services/institution.service';
import { toDateOnly } from '../../shared/utils/date.util';

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
  isEditMode = false;
  studentId: string | null = null;

  documentTypeOptions = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PASSPORT', label: 'Pasaporte' }
  ];

  typeOptions: { value: string, label: string }[] = [];
  institutionOptions: { value: string, label: string }[] = [];

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private studentsService = inject(StudentsService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private institutionService = inject(InstitutionService);
  private ns = inject(NotificationService);
  readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;
  readonly isInstitutionUser = computed(() => this.currentUser()?.role === 'INSTITUCION');

  constructor() {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      documentType: ['CC', Validators.required],
      document: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      institutionId: ['', Validators.required],
      typeId: ['', Validators.required],
      numeroCarnet: [''],
      fechaDevolucionCarnet: ['']
    });
  }

  ngOnInit() {
    this.studentId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.studentId;

    this.loadInstitutions();
    this.loadStudentTypes();

    if (this.studentId) {
      this.loadStudent();
    }
  }

  loadStudent() {
    if (!this.studentId) return;

    this.studentsService.getStudent(this.studentId).subscribe({
      next: (student) => {
        this.form.patchValue({
          firstName: student.firstName,
          lastName: student.lastName,
          documentType: student.documentType,
          document: student.document,
          email: student.email,
          phone: student.phone || '',
          institutionId: student.institutionId || student.institution?.id || '',
          typeId: student.typeId,
          numeroCarnet: (student as any).numeroCarnet || '',
          fechaDevolucionCarnet: (student as any).fechaDevolucionCarnet ? toDateOnly((student as any).fechaDevolucionCarnet) : ''
        });
      },
      error: (err) => {
        this.ns.error('Error al cargar el estudiante: ' + (err.error?.message || err.message));
      }
    });
  }

  loadInstitutions() {
    this.institutionService.getInstitutions().subscribe({
      next: (institutions) => {
        this.institutionOptions = institutions.map((inst: any) => ({
          value: inst.id,
          label: inst.name,
        }));

        if (this.institutionOptions.length > 0) {
          this.form.patchValue({ institutionId: this.institutionOptions[0].value });
        }

        if (this.isInstitutionUser()) {
          this.form.get('institutionId')?.disable({ emitEvent: false });
        }
      },
      error: (err) => {
        this.ns.error('Error cargando instituciones activas: ' + (err.error?.message || err.message));
      }
    });
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
      institutionId: this.form.get('institutionId')?.invalid && this.form.get('institutionId')?.touched ? 'La institución es requerida' : null,
    };
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const request$ = this.isEditMode && this.studentId
      ? this.studentsService.updateStudent(this.studentId, this.form.getRawValue())
      : this.studentsService.createStudent(this.form.getRawValue());

    request$.subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.ns.success(this.isEditMode ? 'Estudiante actualizado correctamente' : 'Estudiante creado correctamente');
        this.router.navigate(['/students', res.id]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.ns.error(`Error al ${this.isEditMode ? 'actualizar' : 'crear'} el estudiante: ` + (err.error?.message || err.message));
      }
    });
  }
}
