import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AcademicProgramsService } from '../../../core/services/academic-programs.service';
import { InstitutionService } from '../../../institutions/services/institution.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { SelectComponent } from '../../../shared/ui/select/select.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, CardComponent, FormFieldComponent, InputComponent, SelectComponent, FileUploadComponent],
  templateUrl: './program-form.component.html'})
export class ProgramFormComponent implements OnInit {
  programForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  institutions = signal<any[]>([]);

  levelOptions = [
    { label: 'Auxiliar', value: 'Auxiliar' },
    { label: 'Técnico', value: 'Técnico' },
    { label: 'Tecnólogo', value: 'Tecnólogo' },
    { label: 'Pregrado', value: 'Pregrado' },
    { label: 'Posgrado', value: 'Posgrado' },
    { label: 'Especialización', value: 'Especialización' },
    { label: 'Maestria', value: 'Maestria' }
  ];

  institutionOptions = computed(() => {
    return this.institutions().map(i => ({ label: i.name, value: i.id }));
  });

  constructor(
    private fb: FormBuilder,
    private service: AcademicProgramsService,
    private institutionService: InstitutionService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.programForm = this.fb.group({
      name: ['', Validators.required],
      level: ['', Validators.required],
      institutionId: ['', Validators.required],
      technicalAnnex: ['']
    });
  }

  get controlErrors() {
    return {
      name: this.programForm.get('name')?.touched && this.programForm.get('name')?.errors?.['required'] ? 'El nombre es requerido' : null,
      level: this.programForm.get('level')?.touched && this.programForm.get('level')?.errors?.['required'] ? 'El nivel es requerido' : null,
      institutionId: this.programForm.get('institutionId')?.touched && this.programForm.get('institutionId')?.errors?.['required'] ? 'La institucion es requerida' : null,
    };
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!id;
    this.loadInstitutions();
    if (id) {
      this.loadProgram(id);
    }
  }

  onFileSelected(file: File) {
    if (file) {
      // Just storing the name for now as requested by user pattern
      this.programForm.patchValue({ technicalAnnex: file.name });
      this.programForm.markAsDirty();
    } else {
      this.programForm.patchValue({ technicalAnnex: '' });
    }
  }

  loadInstitutions() {
    this.institutionService.getInstitutions().subscribe({
      next: (val) => {
        const data = Array.isArray(val) ? val : (val as any).data || [];        
        this.institutions.set(data);
      },
      error: (err) => console.error(err)
    });
  }

  loadProgram(id: string) {
    this.service.getOne(id).subscribe({
      next: (program) => {
        this.programForm.patchValue({
          name: program.name,
          level: program.level,
          institutionId: program.institutionId,
          technicalAnnex: program.technicalAnnex || ''
        });
      },
      error: (err) => console.error(err)
    });
  }

  onSubmit() {
    if (this.programForm.valid) {
      this.isSubmitting = true;
      const payload = { ...this.programForm.value };
      if(!payload.technicalAnnex) delete payload.technicalAnnex;
      const id = this.route.snapshot.paramMap.get('id');
      const request$ = this.isEditMode && id ? this.service.update(id, payload) : this.service.create(payload);

      request$.subscribe({
        next: (program) => {
          this.router.navigate(['/academic-programs', program.id]);
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
        }
      });
    }
  }
}




