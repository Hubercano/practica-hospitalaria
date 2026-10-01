import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { RotationSchedulesService } from '../../../core/services/rotation-schedules.service';
import { SurveysService } from '../../../surveys/services/surveys.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { compareDateOnly, toDateOnly } from '../../../shared/utils/date.util';

@Component({
  selector: 'app-rotation-schedule-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgSelectModule, ButtonComponent, CardComponent, FormFieldComponent],
  templateUrl: './rotation-schedule-form.component.html',
  styleUrl: './rotation-schedule-form.component.css',
})
export class RotationScheduleFormComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  scheduleId: string | null = null;

  institutions: any[] = [];
  programs: any[] = [];
  areas: any[] = [];
  services: any[] = [];
  teachers: any[] = [];
  students: any[] = [];
  surveys: any[] = [];

  scheduleModeOptions = [
    { label: 'Horario fijo', value: 'FIXED' },
    { label: 'Cuadro de turnos', value: 'SHIFT_BOARD' },
  ];

  dayOptions = [
    { label: 'Lunes', value: 1 },
    { label: 'Martes', value: 2 },
    { label: 'Miercoles', value: 3 },
    { label: 'Jueves', value: 4 },
    { label: 'Viernes', value: 5 },
    { label: 'Sabado', value: 6 },
    { label: 'Domingo', value: 0 },
  ];

  shiftTypeOptions = [
    { label: 'Ronda 5h', value: 'ROUND_5H' },
    { label: 'Diurno', value: 'DAY' },
    { label: 'Nocturno', value: 'NIGHT' },
    { label: 'Personalizado', value: 'CUSTOM' },
  ];

  private allPrograms: any[] = [];
  private allAreas: any[] = [];

  constructor(
    private fb: FormBuilder,
    private svc: RotationSchedulesService,
    private surveysService: SurveysService,
    private ns: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      institutionId: ['', Validators.required],
      programId: ['', Validators.required],
      areaId: ['', Validators.required],
      teacherIds: [[]],
      studentIds: [[]],
      surveyId: [''],
      sendAfterRotationEnd: [true],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      scheduleMode: ['FIXED', Validators.required],
      shiftBoardPublishDaysBefore: [8],
      fixedBlocks: this.fb.array([]),
      shiftDefinitions: this.fb.array([]),
    });
  }

  get fixedBlocksArray(): FormArray {
    return this.form.get('fixedBlocks') as FormArray;
  }

  get shiftDefinitionsArray(): FormArray {
    return this.form.get('shiftDefinitions') as FormArray;
  }

  get isFixedMode(): boolean {
    return this.form.get('scheduleMode')?.value === 'FIXED';
  }

  get isShiftBoardMode(): boolean {
    return this.form.get('scheduleMode')?.value === 'SHIFT_BOARD';
  }

  get canViewMatrix(): boolean {
    return !!this.scheduleId && this.isShiftBoardMode;
  }

  ngOnInit() {
    this.scheduleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.scheduleId;

    this.addFixedBlock();

    this.svc.getInstitutions().subscribe((data) => {
      this.institutions = data || [];
    });

    this.svc.getPrograms().subscribe((data) => {
      this.allPrograms = data || [];
      this.programs = this.allPrograms;
      this.tryLoadSchedule();
    });

    this.svc.getAreas().subscribe((data) => {
      this.allAreas = data || [];
      this.areas = this.allAreas;
      this.tryLoadSchedule();
    });

    this.svc.getServices().subscribe((data) => {
      this.services = Array.isArray(data) ? data : [];
    });

    this.svc.getTeachers().subscribe((data) => {
      const arr = Array.isArray(data) ? data : [];
      this.teachers = arr.map((t: any) => ({ ...t, fullName: `${t.firstName || ''} ${t.lastName || ''}`.trim() }));
      this.tryLoadSchedule();
    });

    this.svc.getStudents().subscribe((data) => {
      const arr = Array.isArray(data) ? data : [];
      this.students = arr.map((s: any) => ({ ...s, fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() }));
      this.tryLoadSchedule();
    });

    this.surveysService.getSurveys('ACTIVE').subscribe({
      next: (data) => {
        this.surveys = Array.isArray(data) ? data.filter((s: any) => s.isPublished) : [];
      },
      error: () => {
        this.surveys = [];
      },
    });

    this.form.get('institutionId')?.valueChanges.subscribe((val) => {
      this.programs = val ? this.allPrograms.filter((p: any) => p.institutionId === val) : this.allPrograms;
      this.areas = [];
      this.form.patchValue({ programId: '', areaId: '' }, { emitEvent: false });
    });

    this.form.get('programId')?.valueChanges.subscribe((val) => {
      this.areas = val ? this.allAreas.filter((a: any) => a.programId === val) : this.allAreas;
      this.form.patchValue({ areaId: '' }, { emitEvent: false });
    });

    this.form.get('scheduleMode')?.valueChanges.subscribe((mode) => {
      if (mode === 'FIXED' && !this.fixedBlocksArray.length) {
        this.addFixedBlock();
      }

      if (mode === 'SHIFT_BOARD' && !this.shiftDefinitionsArray.length) {
        this.addShiftDefinition();
      }
    });
  }

  addFixedBlock(block?: any) {
    this.fixedBlocksArray.push(
      this.fb.group({
        dayOfWeek: [block?.dayOfWeek ?? 1, Validators.required],
        startTime: [block?.startTime ?? '07:00', Validators.required],
        endTime: [block?.endTime ?? '12:00', Validators.required],
        serviceId: [block?.serviceId ?? null],
        shiftType: [block?.shiftType ?? 'CUSTOM'],
        notes: [block?.notes ?? ''],
      }),
    );
  }

  removeFixedBlock(index: number) {
    if (this.fixedBlocksArray.length <= 1) {
      return;
    }

    this.fixedBlocksArray.removeAt(index);
  }

  addShiftDefinition(definition?: any) {
    this.shiftDefinitionsArray.push(
      this.fb.group({
        name: [definition?.name ?? '', Validators.required],
        startTime: [definition?.startTime ?? '07:00', Validators.required],
        endTime: [definition?.endTime ?? '12:00', Validators.required],
      }),
    );
  }

  removeShiftDefinition(index: number) {
    if (this.shiftDefinitionsArray.length <= 1) {
      return;
    }

    this.shiftDefinitionsArray.removeAt(index);
  }

  private setFixedBlocks(blocks: any[]) {
    this.fixedBlocksArray.clear();
    if (!blocks?.length) {
      this.addFixedBlock();
      return;
    }

    blocks.forEach((block) => this.addFixedBlock(block));
  }

  private setShiftDefinitions(definitions: any[]) {
    this.shiftDefinitionsArray.clear();
    if (!definitions?.length) {
      this.addShiftDefinition();
      return;
    }

    definitions.forEach((definition) => this.addShiftDefinition(definition));
  }

  private tryLoadSchedule() {
    if (!this.isEditMode || !this.scheduleId) return;
    if (!this.allPrograms.length || !this.allAreas.length) return;

    this.svc.getOne(this.scheduleId).subscribe({
      next: (schedule: any) => {
        const institutionId = schedule.institutionId || '';
        const programId = schedule.programId || '';

        this.programs = institutionId ? this.allPrograms.filter((p: any) => p.institutionId === institutionId) : this.allPrograms;
        this.areas = programId ? this.allAreas.filter((a: any) => a.programId === programId) : this.allAreas;

        this.form.patchValue(
          {
            institutionId,
            programId,
            areaId: schedule.areaId || '',
            teacherIds: Array.isArray(schedule.teacherIds) ? schedule.teacherIds : [],
            studentIds: Array.isArray(schedule.studentIds) ? schedule.studentIds : [],
            surveyId: '',
            sendAfterRotationEnd: true,
            startDate: toDateOnly(schedule.startDate),
            endDate: toDateOnly(schedule.endDate),
            scheduleMode: schedule.scheduleMode || 'FIXED',
            shiftBoardPublishDaysBefore: schedule.shiftBoardPublishDaysBefore ?? 8,
          },
          { emitEvent: false },
        );

        this.setFixedBlocks(schedule.fixedBlocks || []);
        this.setShiftDefinitions(schedule.shiftDefinitions || []);

        this.surveysService.getRotationAssignment(schedule.id).subscribe({
          next: (assignment: any) => {
            this.form.patchValue(
              {
                surveyId: assignment?.survey?.id || '',
                sendAfterRotationEnd: assignment?.sendAfterRotationEnd ?? true,
              },
              { emitEvent: false },
            );
          },
          error: () => {
            // Rotacion sin encuesta asignada.
          },
        });
      },
      error: (err) => {
        this.ns.error(err?.error?.message || 'No se pudo cargar la programacion');
      },
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

    if (payload.scheduleMode === 'FIXED' && !this.fixedBlocksArray.length) {
      this.ns.error('Debe agregar al menos un bloque de horario fijo.');
      return;
    }

    if (payload.scheduleMode === 'SHIFT_BOARD' && !this.shiftDefinitionsArray.length) {
      this.ns.error('Debe agregar al menos un turno para cuadro de turnos.');
      return;
    }

    const cleanPayload = {
      institutionId: payload.institutionId,
      programId: payload.programId,
      areaId: payload.areaId,
      teacherIds: payload.teacherIds,
      studentIds: payload.studentIds,
      startDate: payload.startDate,
      endDate: payload.endDate,
      scheduleMode: payload.scheduleMode,
      shiftBoardPublishDaysBefore: payload.scheduleMode === 'SHIFT_BOARD' ? Number(payload.shiftBoardPublishDaysBefore || 8) : null,
      fixedBlocks:
        payload.scheduleMode === 'FIXED'
          ? (payload.fixedBlocks || []).map((block: any) => ({
              dayOfWeek: Number(block.dayOfWeek),
              startTime: block.startTime,
              endTime: block.endTime,
              serviceId: block.serviceId || undefined,
              shiftType: block.shiftType || 'CUSTOM',
              notes: block.notes || undefined,
            }))
          : [],
      shiftDefinitions:
        payload.scheduleMode === 'SHIFT_BOARD'
          ? (payload.shiftDefinitions || []).map((definition: any) => ({
              name: definition.name,
              startTime: definition.startTime,
              endTime: definition.endTime,
            }))
          : [],
    };

    this.isSubmitting = true;
    const request$ = this.isEditMode && this.scheduleId ? this.svc.update(this.scheduleId, cleanPayload) : this.svc.create(cleanPayload);

    request$.subscribe({
      next: (result: any) => {
        const rotationScheduleId = this.isEditMode ? this.scheduleId : result?.id;
        const surveyId = payload.surveyId as string;

        if (!rotationScheduleId || !surveyId) {
          this.isSubmitting = false;
          this.ns.success(this.isEditMode ? 'Programacion actualizada correctamente' : 'Programacion creada correctamente');
          this.router.navigate(['/rotation-schedules']);
          return;
        }

        this.surveysService.assignSurveyToRotation(rotationScheduleId, surveyId, !!payload.sendAfterRotationEnd).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.ns.success(this.isEditMode ? 'Programacion y encuesta actualizadas correctamente' : 'Programacion y encuesta asignadas correctamente');
            this.router.navigate(['/rotation-schedules']);
          },
          error: (assignmentErr) => {
            this.isSubmitting = false;
            this.ns.error(
              'La rotacion se guardo, pero no se pudo asignar la encuesta: ' +
                (assignmentErr?.error?.message || assignmentErr?.message || 'Error desconocido'),
            );
            this.router.navigate(['/rotation-schedules']);
          },
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        const message = this.getSaveErrorMessage(err);
        this.ns.error(message);

        if (message.includes('excede el maximo permitido')) {
          alert(message);
        }
      },
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

    if (message.includes('excede el maximo permitido')) {
      return message;
    }

    return message || 'Error al guardar programacion';
  }
}