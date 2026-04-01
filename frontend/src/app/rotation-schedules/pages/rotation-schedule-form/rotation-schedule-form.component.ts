import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { RotationSchedulesService } from '../../../core/services/rotation-schedules.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { compareDateOnly, toDateOnly } from '../../../shared/utils/date.util';

@Component({
  selector: 'app-rotation-schedule-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgSelectModule,
    ButtonComponent,
    CardComponent,
    FormFieldComponent
  ],
  templateUrl: './rotation-schedule-form.component.html',
  styleUrl: './rotation-schedule-form.component.css'
})
export class RotationScheduleFormComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  scheduleId: string | null = null;

  institutions: any[] = [];
  programs: any[] = [];
  areas: any[] = [];
  teachers: any[] = [];
  students: any[] = [];

  private allPrograms: any[] = [];
  private allAreas: any[] = [];

  constructor(
    private fb: FormBuilder,
    private svc: RotationSchedulesService,
    private ns: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      institutionId: ['', Validators.required],
      programId: ['', Validators.required],
      areaId: ['', Validators.required],
      teacherIds: [[]],
      studentIds: [[]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.scheduleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.scheduleId;

    this.svc.getInstitutions().subscribe(data => {
      this.institutions = data || [];
    });

    this.svc.getPrograms().subscribe(data => {
      this.allPrograms = data || [];
      this.programs = this.allPrograms;
      this.tryLoadSchedule();
    });

    this.svc.getAreas().subscribe(data => {
      this.allAreas = data || [];
      this.areas = this.allAreas;
      this.tryLoadSchedule();
    });

    this.svc.getTeachers().subscribe(data => {
      const arr = Array.isArray(data) ? data : [];
      this.teachers = arr.map((t: any) => ({ ...t, fullName: `${t.firstName || ''} ${t.lastName || ''}`.trim() }));
      this.tryLoadSchedule();
    });

    this.svc.getStudents().subscribe(data => {
      const arr = Array.isArray(data) ? data : [];
      this.students = arr.map((s: any) => ({ ...s, fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() }));
      this.tryLoadSchedule();
    });

    this.form.get('institutionId')?.valueChanges.subscribe((val) => {
      this.programs = val
        ? this.allPrograms.filter((p: any) => p.institutionId === val)
        : this.allPrograms;
      this.areas = [];
      this.form.patchValue({ programId: '', areaId: '' }, { emitEvent: false });
    });

    this.form.get('programId')?.valueChanges.subscribe((val) => {
      this.areas = val
        ? this.allAreas.filter((a: any) => a.programId === val)
        : this.allAreas;
      this.form.patchValue({ areaId: '' }, { emitEvent: false });
    });
  }

  private tryLoadSchedule() {
    if (!this.isEditMode || !this.scheduleId) return;
    if (!this.allPrograms.length || !this.allAreas.length) return;

    this.svc.getOne(this.scheduleId).subscribe({
      next: (schedule: any) => {
        const institutionId = schedule.institutionId || '';
        const programId = schedule.programId || '';

        this.programs = institutionId
          ? this.allPrograms.filter((p: any) => p.institutionId === institutionId)
          : this.allPrograms;

        this.areas = programId
          ? this.allAreas.filter((a: any) => a.programId === programId)
          : this.allAreas;

        this.form.patchValue({
          institutionId,
          programId,
          areaId: schedule.areaId || '',
          teacherIds: Array.isArray(schedule.teacherIds) ? schedule.teacherIds : [],
          studentIds: Array.isArray(schedule.studentIds) ? schedule.studentIds : [],
          startDate: toDateOnly(schedule.startDate),
          endDate: toDateOnly(schedule.endDate)
        }, { emitEvent: false });
      },
      error: (err) => {
        this.ns.error(err?.error?.message || 'No se pudo cargar la programación');
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.ns.error('Completa todos los campos obligatorios');
      return;
    }

    const payload = this.form.value;
    if (compareDateOnly(payload.endDate as string, payload.startDate as string) <= 0) {
      this.ns.error('La fecha fin debe ser mayor que la fecha inicio');
      return;
    }

    this.isSubmitting = true;
    const request$ = this.isEditMode && this.scheduleId
      ? this.svc.update(this.scheduleId, payload)
      : this.svc.create(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.ns.success(this.isEditMode ? 'Programación actualizada correctamente' : 'Programación creada correctamente');
        this.router.navigate(['/rotation-schedules']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const message = this.getSaveErrorMessage(err);
        this.ns.error(message);

        // Ensure the capacity violation is always visible to the user.
        if (message.includes('excede el máximo permitido')) {
          alert(message);
        }
      }
    });
  }

  private getSaveErrorMessage(err: any): string {
    const nested = err?.error;
    const rawMessage = nested?.message ?? err?.message ?? nested;

    let message = '';
    if (Array.isArray(rawMessage)) {
      message = rawMessage.join('. ');
    } else if (typeof rawMessage === 'string') {
      message = rawMessage;
    } else if (rawMessage && typeof rawMessage === 'object' && typeof rawMessage.message === 'string') {
      message = rawMessage.message;
    }

    if (message.includes('excede el máximo permitido')) {
      return message;
    }

    return message || 'Error al guardar programación';
  }
}
