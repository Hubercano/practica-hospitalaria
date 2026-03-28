import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { RotationSchedulesService } from '../../../core/services/rotation-schedules.service';
import { NotificationService } from '../../../shared/notification/notification.service';

@Component({
  selector: 'app-rotation-schedule-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, TableComponent],
  templateUrl: './rotation-schedule-list.component.html'
})
export class RotationScheduleListComponent implements OnInit {
  schedules = signal<any[]>([]);

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

  constructor(private svc: RotationSchedulesService, private ns: NotificationService, private router: Router) {}

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
