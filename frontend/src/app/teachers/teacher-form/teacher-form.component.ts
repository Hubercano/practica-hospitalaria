import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TeacherService, Teacher } from '../teacher.service';
import { NotificationService } from '../../shared/notification/notification.service';

// UI Components
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../shared/ui/input/input.component';
import { SelectComponent } from '../../shared/ui/select/select.component';
import { FileUploadComponent } from '../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, CardComponent, FormFieldComponent, InputComponent, SelectComponent, FileUploadComponent],
  templateUrl: './teacher-form.component.html'
})
export class TeacherFormComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  teacherId: string | null = null;
  teacherData: Teacher | null = null;
  isSubmitting = false;

  // Track files locally before uploading
  filesToUpload: { [key: string]: File } = {};
  multipleFilesToUpload: { [key: string]: File[] } = {};

  documentTypeOptions = [
    { label: 'Cédula de Ciudadanía', value: 'CC' },
    { label: 'Cédula de Extranjería', value: 'CE' },
    { label: 'Pasaporte', value: 'PA' }
  ];

  supervisionOptions = [
    { label: 'Directa', value: 'directa' },
    { label: 'Indirecta', value: 'indirecta' },
    { label: 'Delegada', value: 'delegada' }
  ];

  contractOptions = [
    { label: 'Interno', value: 'interno' },
    { label: 'Externo', value: 'externo' },
    { label: 'Convenio', value: 'convenio' },
    { label: 'Prestador', value: 'prestador' }
  ];

  constructor(
    private fb: FormBuilder,
    private teacherService: TeacherService,
    private router: Router,
    private route: ActivatedRoute,
    private ns: NotificationService
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      documentType: ['CC', Validators.required],
      document: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      supervisionType: ['directa', Validators.required],
      contractType: ['interno', Validators.required]
    });
  }

  get controlErrors() {
    return {
      firstName: this.form.get('firstName')?.touched && this.form.get('firstName')?.errors?.['required'] ? 'El nombre es requerido' : null,
      lastName: this.form.get('lastName')?.touched && this.form.get('lastName')?.errors?.['required'] ? 'Los apellidos son requeridos' : null,
      document: this.form.get('document')?.touched && this.form.get('document')?.errors?.['required'] ? 'El documento es requerido' : null,
      email: this.form.get('email')?.touched && this.form.get('email')?.errors?.['required'] ? 'El correo es requerido' : 
             this.form.get('email')?.touched && this.form.get('email')?.errors?.['email'] ? 'Formato de correo inválido' : null,
    };
  }

  ngOnInit() {
    this.teacherId = this.route.snapshot.paramMap.get('id');
    if (this.teacherId) {
      this.isEditMode = true;
      this.teacherService.getTeacher(this.teacherId).subscribe(data => {        
        this.teacherData = data;
        this.form.patchValue(data);
      });
    }
  }

  onFileSelected(file: File, field: string) {
    if (file) {
      this.filesToUpload[field] = file;
    } else {
      delete this.filesToUpload[field];
    }
  }

  onMultipleFilesSelected(files: File[], field: string) {
    if (files && files.length > 0) {
      this.multipleFilesToUpload[field] = files;
    } else {
      delete this.multipleFilesToUpload[field];
    }
  }

  async deleteFile(field: string) {
    if (!this.teacherId || !confirm('¿Seguro que desea eliminar este documento?')) return;
    try {
      await this.teacherService.deleteDocument(this.teacherId, field).toPromise();
      (this.teacherData as any)[field] = null;
    } catch (err: any) {
      this.ns.error('Error al eliminar: ' + (err.error?.message || err.message));
    }
  }

  async deleteMultipleFile(field: 'teacherTrainingFiles' | 'teacherRecognitionFiles', filePath: string) {
    if (!this.teacherId || !confirm('¿Seguro que desea eliminar este archivo?')) return;
    try {
      const updatedTeacher = await this.teacherService.deleteMultipleDocument(this.teacherId, field, filePath).toPromise();
      if (updatedTeacher) {
        this.teacherData = updatedTeacher;
      }
      this.ns.success('Archivo eliminado correctamente');
    } catch (err: any) {
      this.ns.error('Error al eliminar archivo: ' + (err.error?.message || err.message));
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    try {
      let createdOrUpdatedId: string;

      if (this.isEditMode && this.teacherId) {
        await this.teacherService.updateTeacher(this.teacherId, this.form.value).toPromise();
        createdOrUpdatedId = this.teacherId;
      } else {
        const res: any = await this.teacherService.createTeacher(this.form.value).toPromise();
        createdOrUpdatedId = res.id;
      }

      // Upload files sequentially if any
      const uploadPromises = [];
      for (const [field, file] of Object.entries(this.filesToUpload)) {
         uploadPromises.push(this.teacherService.uploadDocument(createdOrUpdatedId, field, file).toPromise());
      }

      for (const [field, files] of Object.entries(this.multipleFilesToUpload)) {
        if (files.length > 0) {
          uploadPromises.push(this.teacherService.uploadMultipleDocuments(createdOrUpdatedId, field, files).toPromise());
        }
      }

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      this.router.navigate(['/teachers']);
    } catch (err: any) {
      this.isSubmitting = false;
      this.ns.error('Error en el formulario: ' + (err.error?.message || err.message));
    }
  }
}
