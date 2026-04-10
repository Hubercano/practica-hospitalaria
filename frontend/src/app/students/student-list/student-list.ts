import { Component, OnInit, inject, signal, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { StudentsService } from '../students.service';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../shared/ui/file-upload/file-upload.component';
import { exportToExcel } from '../../shared/utils/excel-export.util';
import { FilterChipsComponent, FilterChip } from '../../shared/ui/filter-chips/filter-chips.component';
import { toDateOnly } from '../../shared/utils/date.util';
import { getEstadoInduccion, getEstadoCarnet, getEstadoCarnetBadgeClass, tieneCarnetEntregado } from '../../shared/utils/student-induction.util';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule, ButtonComponent, ModalComponent, FileUploadComponent, FilterChipsComponent],
  templateUrl: './student-list.html',
  styleUrls: ['./student-list.css']
})
export class StudentList implements OnInit {
  students = signal<any[]>([]);
  allStudents: any[] = [];

  showFilters = false;
  filtersForm: FormGroup;
  institutionOptions: string[] = [];
  typeOptions: string[] = [];
  statusOptions: string[] = [];
  stateOptions = [
    { label: 'Activo', value: 'ACTIVE' },
    { label: 'Inactivo', value: 'INACTIVE' }
  ];

  private studentsService = inject(StudentsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private ns = inject(NotificationService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  showUploadModal = false;
  isUploading = false;
  uploadResult: any = null;
  selectedFile: File | null = null;
  readonly getEstadoCarnetBadgeClass = getEstadoCarnetBadgeClass;
  readonly currentUser = this.authService.currentUser;
  readonly isInstitutionUser = computed(() => this.currentUser()?.role === 'INSTITUCION');

  constructor() {
    this.filtersForm = this.fb.group({
      document: [''],
      name: [''],
      email: [''],
      institutions: [[]],
      types: [[]],
      statuses: [[]],
      states: [[]]
    });
  }

  get activeChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const f = this.filtersForm.value;
    (f.institutions || []).forEach((v: string) => chips.push({ id: `inst-${v}`, controlName: 'institutions', label: v, value: v, fieldLabel: 'Institución' }));
    (f.types || []).forEach((v: string) => chips.push({ id: `type-${v}`, controlName: 'types', label: v, value: v, fieldLabel: 'Tipo' }));
    (f.statuses || []).forEach((v: string) => chips.push({ id: `status-${v}`, controlName: 'statuses', label: v, value: v, fieldLabel: 'Estado Req.' }));
    (f.states || []).forEach((v: string) => {
      const label = this.stateOptions.find(o => o.value === v)?.label ?? v;
      chips.push({ id: `state-${v}`, controlName: 'states', label, value: v, fieldLabel: 'Estado' });
    });
    return chips;
  }

  removeChip(chip: FilterChip): void {
    const ctrl = this.filtersForm.get(chip.controlName);
    if (ctrl) { ctrl.setValue((ctrl.value || []).filter((v: any) => v !== chip.value)); this.applyFilters(); }
  }

  toggleFiltersPanel() { this.showFilters = !this.showFilters; }

  applyFilters() {
    const f = this.filtersForm.value;
    const doc = (f.document || '').trim().toLowerCase();
    const name = (f.name || '').trim().toLowerCase();
    const email = (f.email || '').trim().toLowerCase();
    const institutions: string[] = f.institutions || [];
    const types: string[] = f.types || [];
    const statuses: string[] = f.statuses || [];
    const states: string[] = f.states || [];

    this.students.set(this.allStudents.filter(item => {
      return (!doc || String(item.document || '').toLowerCase().includes(doc))
        && (!name || (item.name || '').toLowerCase().includes(name))
        && (!email || (item.email || '').toLowerCase().includes(email))
        && (!institutions.length || institutions.includes(item.institutionName))
        && (!types.length || types.includes(item.studentType))
        && (!statuses.length || statuses.includes(item.status))
        && (!states.length || states.includes(item.state));
    }));
  }

  clearFilters() {
    this.filtersForm.reset({ document: '', name: '', email: '', institutions: [], types: [], statuses: [], states: [] });
    this.students.set([...this.allStudents]);
  }

  async exportCurrentTableData() {
    const rows = this.students();
    if (!rows.length) { this.ns.error('No hay datos para exportar.'); return; }
    await exportToExcel(rows.map(item => ({
      'Documento': item.document ?? '',
      'Nombre': item.name ?? '',
      'Correo': item.email ?? '',
      'Institución': item.institutionName ?? '',
      'Tipo': item.studentType ?? '',
      'Estado Requisitos': item.status ?? '',
      'Estado Inducción': item.estadoInduccion ?? '',
      'Carnet': item.numeroCarnet ? item.numeroCarnet : 'Sin carnet',
      'Estado Carnet': item.estadoCarnet ?? '',
      'Estado': item.stateLabel ?? ''
    })), 'estudiantes', 'Estudiantes');
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.studentsService.getStudents(true).subscribe({
      next: (data) => {
        const rawData = Array.isArray(data) ? data : [];
        
        const mappedData = rawData.map((s: any) => {
           const firstName = s.firstName ? s.firstName : '';
           const lastName = s.lastName ? s.lastName : '';
           const estado = getEstadoInduccion(s.inductionCompletedAt, s.inductionExpiresAt);
           const estadoCarnet = getEstadoCarnet(s.numeroCarnet, s.fechaDevolucionCarnet);
           
           return {
              ...s,
              name: firstName + ' ' + lastName,
              institutionName: s.institution?.name || '-',
              studentType: s.type ? s.type.name : '-',
              status: s.status || 'PENDIENTE',
              estadoInduccion: estado,
              inductionCompletedAt: s.inductionCompletedAt || null,
              inductionExpiresAt: s.inductionExpiresAt || null,
              numeroCarnet: s.numeroCarnet || null,
              fechaDevolucionCarnet: s.fechaDevolucionCarnet || null,
              estadoCarnet: estadoCarnet,
              tieneCarnet: tieneCarnetEntregado(s.numeroCarnet),
              stateLabel: s.state === 'ACTIVE' ? 'Activo' : 'Inactivo'
           };
        });
        
        this.allStudents = mappedData;
        this.institutionOptions = Array.from(new Set(mappedData.map((s: any) => s.institutionName).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
        this.typeOptions = Array.from(new Set(mappedData.map((s: any) => s.studentType).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
        this.statusOptions = Array.from(new Set(mappedData.map((s: any) => s.status).filter(Boolean))) as string[];
        this.students.set(mappedData);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching students', err)
    });
  }

  onViewDetail(item: any) {
    this.router.navigate(['/students', item.id]);
  }

  onEdit(item: any) {
    this.router.navigate(['/students', item.id, 'edit']);
  }

  onToggleState(item: any) {
    const isActive = item.state === 'ACTIVE';
    const nextState = isActive ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = isActive ? 'inactivar' : 'activar';

    if (!confirm(`¿Seguro que deseas ${actionLabel} este estudiante?`)) {
      return;
    }

    this.studentsService.updateStudentState(item.id, nextState).subscribe({
      next: () => {
        this.ns.success(`Estudiante ${isActive ? 'inactivado' : 'activado'} correctamente`);
        this.loadData();
      },
      error: (err) => this.ns.error('Error al actualizar estado: ' + (err.error?.message || err.message))
    });
  }

  openUploadModal() {
    this.showUploadModal = true;
    this.uploadResult = null;
    this.selectedFile = null;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadResult = null;
    this.selectedFile = null;
    this.isUploading = false;
    this.loadData();
  }

  downloadTemplate() {
    this.studentsService.downloadTemplate().subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_estudiantes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  onFileSelected(file: File) {
    this.selectedFile = file || null;
  }

  uploadFile() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.studentsService.uploadBulk(this.selectedFile).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadResult = res;
        this.ns.success('Carga masiva de estudiantes exitosa.');
        this.closeUploadModal();
      },
      error: (err) => {
        this.isUploading = false;
        this.ns.error('Error en la carga: ' + (err.error?.message || err.message));
      }
    });
  }
}
