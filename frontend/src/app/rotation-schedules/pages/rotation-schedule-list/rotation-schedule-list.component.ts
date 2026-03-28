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
  editingScheduleId: string | null = null;

  columns: Column[] = [
    { key: 'institutionName', label: 'Institución' },
    { key: 'programName', label: 'Programa' },
    { key: 'areaName', label: 'Área' },
    { key: 'servicesList', label: 'Servicios' },
    { key: 'teachersList', label: 'Docentes' },
    { key: 'studentsList', label: 'Estudiantes' },
    { key: 'startDate', label: 'Inicio', type: 'date' },
    { key: 'endDate', label: 'Fin', type: 'date' },
    { key: 'actions', label: 'Acciones', type: 'actions' }
  ];

  institutions: any[] = [];
  programs: any[] = [];
  areas: any[] = [];
  services: any[] = [];
  teachers: any[] = [];
  students: any[] = [];

  private rawSchedules: any[] = [];
  private allPrograms: any[] = [];
  private allAreas: any[] = [];
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
    this.svc.getPrograms().subscribe(data => {
      this.allPrograms = data || [];
      this.programs = this.allPrograms;
      this.mapSchedules();
    });
    this.svc.getAreas().subscribe(data => {
      this.allAreas = data || [];
      this.areas = this.allAreas;
      this.mapSchedules();
    });
    this.svc.getServices().subscribe(data => { this.services = data || []; this.mapSchedules(); });
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
      // Filter from source copy to avoid losing data after successive selections
      this.programs = val
        ? this.allPrograms.filter((p: any) => p.institutionId === val)
        : this.allPrograms;
      this.areas = [];
      this.form.patchValue({ programId: '', areaId: '' });
    });

    this.form.get('programId')?.valueChanges.subscribe(val => {
      this.areas = val
        ? this.allAreas.filter((a: any) => a.programId === val)
        : this.allAreas;
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
      const area = s.area || this.allAreas.find((a: any) => a.id === s.areaId || a._id === s.areaId);
      const institutionName = s.institution?.name || s.institutionName || this.lookupName(this.institutions, s.institutionId) || '-';
      const programName = s.program?.name || s.programName || this.lookupName(this.allPrograms, s.programId) || '-';
      const areaName = area?.name || s.areaName || this.lookupName(this.allAreas, s.areaId) || '-';

      const areaServices = Array.isArray(area?.services)
        ? area.services.map((sv: any) => sv.name).filter((name: string) => !!name)
        : [];
      const serviceIds = Array.isArray(area?.serviceIds) ? area.serviceIds : [];
      const servicesFromIds = serviceIds
        .map((serviceId: string) => this.lookupName(this.services, serviceId))
        .filter((name: string | undefined) => !!name) as string[];
      const mergedServices = Array.from(new Set([...areaServices, ...servicesFromIds]));
      const servicesList = mergedServices.length ? mergedServices.join(', ') : '-';

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

      return { ...s, institutionName, programName, areaName, servicesList, teachersList, studentsList, startDate, endDate };
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

  openModal(schedule?: any) {
    this.showModal = true;
    if (!schedule) {
      this.editingScheduleId = null;
      this.form.reset({
        institutionId: '',
        programId: '',
        areaId: '',
        teacherIds: [],
        studentIds: [],
        startDate: '',
        endDate: ''
      });
      this.programs = this.allPrograms;
      this.areas = this.allAreas;
      return;
    }

    this.editingScheduleId = schedule.id;
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
      startDate: schedule.startDate ? new Date(schedule.startDate).toISOString().slice(0, 10) : '',
      endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().slice(0, 10) : ''
    });
  }

  closeModal() {
    this.showModal = false;
    this.editingScheduleId = null;
  }

  onViewDetail(schedule: any) {
    this.openModal(schedule);
  }

  onDelete(schedule: any) {
    if (!schedule?.id) return;
    if (!confirm('¿Seguro que deseas eliminar esta programación?')) return;

    this.svc.remove(schedule.id).subscribe({
      next: () => {
        this.ns.success('Programación eliminada correctamente');
        this.loadAll();
      },
      error: (err) => {
        this.ns.error(err?.error?.message || 'Error al eliminar programación');
      }
    });
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
    const request$ = this.editingScheduleId
      ? this.svc.update(this.editingScheduleId, payload)
      : this.svc.create(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.ns.success(this.editingScheduleId ? 'Programación actualizada correctamente' : 'Programación creada correctamente');
        this.closeModal();
        this.loadAll();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.ns.error(err?.error?.message || 'Error al guardar programación');
      }
    });
  }
}
