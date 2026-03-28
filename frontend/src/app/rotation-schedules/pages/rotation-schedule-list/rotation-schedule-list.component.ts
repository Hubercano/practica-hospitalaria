import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { RotationSchedulesService } from '../../../core/services/rotation-schedules.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { exportToExcel } from '../../../shared/utils/excel-export.util';
import { FilterChipsComponent, FilterChip } from '../../../shared/ui/filter-chips/filter-chips.component';

@Component({
  selector: 'app-rotation-schedule-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, ButtonComponent, TableComponent, FilterChipsComponent],
  templateUrl: './rotation-schedule-list.component.html'
})
export class RotationScheduleListComponent implements OnInit {
  schedules = signal<any[]>([]);
  allMappedSchedules: any[] = [];

  showFilters = false;
  filtersForm: FormGroup;
  filterInstitutionOptions: string[] = [];
  filterProgramOptions: string[] = [];
  filterAreaOptions: string[] = [];

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

  constructor(private svc: RotationSchedulesService, private fb: FormBuilder, private ns: NotificationService, private router: Router, private cdr: ChangeDetectorRef) {
    this.filtersForm = this.fb.group({
      institutions: [[]],
      programs: [[]],
      areas: [[]],
      serviceText: [''],
      teacherText: [''],
      studentText: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  get activeChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const f = this.filtersForm.value;
    (f.institutions || []).forEach((v: string) => chips.push({ id: `inst-${v}`, controlName: 'institutions', label: v, value: v, fieldLabel: 'Institución' }));
    (f.programs || []).forEach((v: string) => chips.push({ id: `prog-${v}`, controlName: 'programs', label: v, value: v, fieldLabel: 'Programa' }));
    (f.areas || []).forEach((v: string) => chips.push({ id: `area-${v}`, controlName: 'areas', label: v, value: v, fieldLabel: 'Área' }));
    return chips;
  }

  removeChip(chip: FilterChip): void {
    const ctrl = this.filtersForm.get(chip.controlName);
    if (ctrl) { ctrl.setValue((ctrl.value || []).filter((v: any) => v !== chip.value)); this.applyFilters(); }
  }

  toggleFiltersPanel() { this.showFilters = !this.showFilters; }

  applyFilters() {
    const f = this.filtersForm.value;
    const institutions: string[] = f.institutions || [];
    const programs: string[] = f.programs || [];
    const areas: string[] = f.areas || [];
    const svcText = (f.serviceText || '').trim().toLowerCase();
    const teacherText = (f.teacherText || '').trim().toLowerCase();
    const studentText = (f.studentText || '').trim().toLowerCase();
    const startDate = f.startDate ? new Date(f.startDate).getTime() : null;
    const endDate = f.endDate ? new Date(f.endDate).getTime() : null;

    this.schedules.set(this.allMappedSchedules.filter(item => {
      return (!institutions.length || institutions.includes(item.institutionName))
        && (!programs.length || programs.includes(item.programName))
        && (!areas.length || areas.includes(item.areaName))
        && (!svcText || (item.servicesList || '').toLowerCase().includes(svcText))
        && (!teacherText || (item.teachersList || '').toLowerCase().includes(teacherText))
        && (!studentText || (item.studentsList || '').toLowerCase().includes(studentText))
        && (!startDate || !item.startDate || new Date(item.startDate).getTime() >= startDate)
        && (!endDate || !item.endDate || new Date(item.endDate).getTime() <= endDate);
    }));
  }

  clearFilters() {
    this.filtersForm.reset({ institutions: [], programs: [], areas: [], serviceText: '', teacherText: '', studentText: '', startDate: '', endDate: '' });
    this.schedules.set([...this.allMappedSchedules]);
  }

  async exportCurrentTableData() {
    const rows = this.schedules();
    if (!rows.length) { this.ns.error('No hay datos para exportar.'); return; }
    await exportToExcel(rows.map(item => ({
      'Institución': item.institutionName ?? '',
      'Programa': item.programName ?? '',
      'Área': item.areaName ?? '',
      'Servicios': item.servicesList ?? '',
      'Docentes': item.teachersList ?? '',
      'Estudiantes': item.studentsList ?? '',
      'Inicio': item.startDate ? new Date(item.startDate).toLocaleDateString('es-CO') : '',
      'Fin': item.endDate ? new Date(item.endDate).toLocaleDateString('es-CO') : ''
    })), 'rotaciones', 'Rotaciones');
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

    this.loadAll();
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

    this.allMappedSchedules = mapped;
    this.filterInstitutionOptions = Array.from(new Set(mapped.map((m: any) => m.institutionName).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
    this.filterProgramOptions = Array.from(new Set(mapped.map((m: any) => m.programName).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
    this.filterAreaOptions = Array.from(new Set(mapped.map((m: any) => m.areaName).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
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

  goToCreate() {
    this.router.navigate(['/rotation-schedules/new']);
  }

  onViewDetail(schedule: any) {
    if (!schedule?.id) return;
    this.router.navigate(['/rotation-schedules', schedule.id, 'edit']);
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
}
