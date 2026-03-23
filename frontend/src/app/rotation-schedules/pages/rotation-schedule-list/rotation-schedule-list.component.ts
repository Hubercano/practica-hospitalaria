import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { RotationSchedulesService } from '../../../core/services/rotation-schedules.service';
import { NotificationService } from '../../../shared/notification/notification.service';

@Component({
  selector: 'app-rotation-schedule-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TableComponent, ModalComponent, FormFieldComponent, NgSelectModule],
  templateUrl: './rotation-schedule-list.component.html'
})
export class RotationScheduleListComponent implements OnInit {
  schedules = signal<any[]>([]);
  showModal = false;
  isSubmitting = false;

  columns: Column[] = [
    { key: 'institutionName', label: 'Institución' },
    { key: 'programName', label: 'Programa' },
    { key: 'areaName', label: 'Área' },
    { key: 'teachersList', label: 'Docentes' },
    { key: 'studentsList', label: 'Estudiantes' },
    { key: 'startDate', label: 'Inicio', type: 'date' },
    { key: 'endDate', label: 'Fin', type: 'date' },
    { key: 'actions', label: 'Acciones', type: 'actions' }
  ];

  institutions: any[] = [];
  programs: any[] = [];
  areas: any[] = [];
  teachers: any[] = [];
  students: any[] = [];

  private rawSchedules: any[] = [];
  form!: FormGroup;

  constructor(private fb: FormBuilder, private svc: RotationSchedulesService, private ns: NotificationService) {
    this.form = this.fb.group({
      institutionId: [''],
      programId: [''],
      areaId: [''],
      teacherIds: [[]],
      studentIds: [[]],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit() {
    this.svc.getInstitutions().subscribe(data => { this.institutions = data || []; this.mapSchedules(); });
    this.svc.getPrograms().subscribe(data => { this.programs = data || []; this.mapSchedules(); });
    this.svc.getAreas().subscribe(data => { this.areas = data || []; this.mapSchedules(); });
    this.svc.getTeachers().subscribe(data => {
      const arr = Array.isArray(data) ? data : [];
      this.teachers = arr.map((t: any) => ({ ...t, fullName: (t.firstName || '') + ' ' + (t.lastName || '') }));
      this.mapSchedules();
    });
    this.svc.getStudents().subscribe(data => {
      const arr = Array.isArray(data) ? data : [];
      this.students = arr.map((s: any) => ({ ...s, fullName: (s.firstName || '') + ' ' + (s.lastName || '') }));
      this.mapSchedules();
    });

    // initial schedules load
    this.loadAll();

    this.form.get('institutionId')?.valueChanges.subscribe(val => {
      // filter programs by institution
      this.programs = (this.programs || []).filter((p: any) => !val || p.institutionId === val);
      this.form.patchValue({ programId: '', areaId: '' });
    });

    this.form.get('programId')?.valueChanges.subscribe(val => {
      this.areas = (this.areas || []).filter((a: any) => !val || a.programId === val);
      this.form.patchValue({ areaId: '' });
    });
  }

  loadAll() {
    this.svc.getAll().subscribe((data: any[]) => {
      this.rawSchedules = Array.isArray(data) ? data : [];
      this.mapSchedules();
    });
  }

  private mapSchedules() {
    const mapped = this.rawSchedules.map((s: any) => {
      const institutionName = s.institution?.name || s.institutionName || this.lookupName(this.institutions, s.institutionId) || '-';
      const programName = s.program?.name || s.programName || this.lookupName(this.programs, s.programId) || '-';
      const areaName = s.area?.name || s.areaName || this.lookupName(this.areas, s.areaId) || '-';

      const teachersArr = Array.isArray(s.teachers) ? s.teachers : (Array.isArray(s.teacherIds) ? s.teacherIds : []);
      const teachersList = Array.isArray(teachersArr) && teachersArr.length
        ? teachersArr.map((t: any) => this.resolvePersonName(t, this.teachers)).join(', ')
        : (s.teacherNames || '');

      const studentsArr = Array.isArray(s.students) ? s.students : (Array.isArray(s.studentIds) ? s.studentIds : []);
      const studentsList = Array.isArray(studentsArr) && studentsArr.length
        ? studentsArr.map((st: any) => this.resolvePersonName(st, this.students)).join(', ')
        : (s.studentNames || '');

      const startDate = s.startDate ? new Date(s.startDate).toISOString() : s.startDate || null;
      const endDate = s.endDate ? new Date(s.endDate).toISOString() : s.endDate || null;

      return { ...s, institutionName, programName, areaName, teachersList, studentsList, startDate, endDate };
    });

    this.schedules.set(mapped);
  }

  private lookupName(list: any[], id: string | undefined) {
    if (!id || !Array.isArray(list)) return undefined;
    const found = list.find((x: any) => x.id === id || x._id === id);
    return found ? (found.name || found.title || found.fullName) : undefined;
  }

  private resolvePersonName(entry: any, list: any[]) {
    if (!entry) return '';
    if (typeof entry === 'string') {
      const found = list.find((x: any) => x.id === entry || x._id === entry);
      return found ? (found.fullName || (found.firstName && found.lastName ? ((found.firstName||'') + ' ' + (found.lastName||'')) : found.name)) : entry;
    }
    if (entry.fullName) return entry.fullName;
    if (entry.firstName || entry.lastName) return ((entry.firstName||'') + ' ' + (entry.lastName||'')).trim();
    return entry.name || entry.id || '';
  }

  openModal() {
    this.showModal = true;
    this.form.reset();
  }

  closeModal() {
    this.showModal = false;
  }

  submit() {
    if (this.form.invalid) return;
    const payload = this.form.value;
    // Validate endDate > startDate (null-safe)
    if (!payload.startDate || !payload.endDate) {
      this.ns.error('Debe completar fecha inicio y fecha fin');
      return;
    }
    const start = new Date(payload.startDate as string);
    const end = new Date(payload.endDate as string);
    if (end <= start) {
      this.ns.error('La fecha fin debe ser mayor que la fecha inicio');
      return;
    }
    this.isSubmitting = true;
    this.svc.create(payload).subscribe({
      next: () => { this.isSubmitting = false; this.closeModal(); this.loadAll(); },
      error: (err) => { this.isSubmitting = false; this.ns.error('Error al crear programación'); }
    });
  }
}
