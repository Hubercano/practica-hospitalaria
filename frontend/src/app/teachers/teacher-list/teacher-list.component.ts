import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TeacherService, Teacher } from '../teacher.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../shared/ui/file-upload/file-upload.component';
import { exportToExcel } from '../../shared/utils/excel-export.util';
import { FilterChipsComponent, FilterChip } from '../../shared/ui/filter-chips/filter-chips.component';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule, ButtonComponent, CardComponent, ModalComponent, FileUploadComponent, FilterChipsComponent],
  templateUrl: './teacher-list.component.html'
})
export class TeacherListComponent implements OnInit {
  teachers = signal<any[]>([]);
  allTeachers: any[] = [];

  showFilters = false;
  filtersForm: FormGroup;
  supervisionOptions: string[] = [];
  contractOptions: string[] = [];
  stateOptions = [
    { label: 'Activo', value: 'ACTIVE' },
    { label: 'Inactivo', value: 'INACTIVE' }
  ];

  showUploadModal = false;
  isUploading = false;
  uploadResult: { total: number; success: number; failed: number; errors: { row: number; message: string }[] } | null = null;
  selectedFile: File | null = null;

  constructor(private teacherService: TeacherService, private fb: FormBuilder, private router: Router, private cdr: ChangeDetectorRef, private ns: NotificationService) {
    this.filtersForm = this.fb.group({
      fullName: [''],
      document: [''],
      email: [''],
      phone: [''],
      supervisions: [[]],
      contracts: [[]],
      states: [[]]
    });
  }

  get activeChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const f = this.filtersForm.value;
    (f.supervisions || []).forEach((v: string) => chips.push({ id: `sv-${v}`, controlName: 'supervisions', label: v, value: v, fieldLabel: 'Supervisión' }));
    (f.contracts || []).forEach((v: string) => chips.push({ id: `ct-${v}`, controlName: 'contracts', label: v, value: v, fieldLabel: 'Contratación' }));
    (f.states || []).forEach((v: string) => {
      const label = this.stateOptions.find(o => o.value === v)?.label ?? v;
      chips.push({ id: `st-${v}`, controlName: 'states', label, value: v, fieldLabel: 'Estado' });
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
    const name = (f.fullName || '').trim().toLowerCase();
    const doc = (f.document || '').trim().toLowerCase();
    const email = (f.email || '').trim().toLowerCase();
    const phone = (f.phone || '').trim().toLowerCase();
    const supervisions: string[] = f.supervisions || [];
    const contracts: string[] = f.contracts || [];
    const states: string[] = f.states || [];

    this.teachers.set(this.allTeachers.filter(t => {
      return (!name || (t.fullName || '').toLowerCase().includes(name))
        && (!doc || (t.documentInfo || '').toLowerCase().includes(doc))
        && (!email || (t.email || '').toLowerCase().includes(email))
        && (!phone || String(t.phone || '').toLowerCase().includes(phone))
        && (!supervisions.length || supervisions.includes(t.supervisionType))
        && (!contracts.length || contracts.includes(t.contractType))
        && (!states.length || states.includes(t.state));
    }));
  }

  clearFilters() {
    this.filtersForm.reset({ fullName: '', document: '', email: '', phone: '', supervisions: [], contracts: [], states: [] });
    this.teachers.set([...this.allTeachers]);
  }

  async exportCurrentTableData() {
    const rows = this.teachers();
    if (!rows.length) { this.ns.error('No hay datos para exportar.'); return; }
    await exportToExcel(rows.map(t => ({
      'Nombre Completo': t.fullName ?? '',
      'Documento': t.documentInfo ?? '',
      'Correo': t.email ?? '',
      'Celular': t.phone ?? '',
      'Supervisión': t.supervisionType ?? '',
      'Contratación': t.contractType ?? '',
      'Estado': t.state === 'ACTIVE' ? 'Activo' : 'Inactivo'
    })), 'docentes', 'Docentes');
  }

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers() {
    this.teacherService.getTeachers().subscribe({
      next: (data) => {
        const rawData = Array.isArray(data) ? data : (data as any) || [];
        
        const mappedData = rawData.map((t: any) => {
          const fName = t.firstName ? t.firstName : '';
          const lName = t.lastName ? t.lastName : '';
          const dtype = t.documentType ? t.documentType : '';
          const doc = t.document ? t.document : '';
          const mail = t.email ? t.email : '';
          const phone = t.phone ? t.phone : '';

          let requiredDocumentCount = 0;
          if (t.cvFile) requiredDocumentCount++;
          if (t.dataAuthorizationFile) requiredDocumentCount++;
          if (t.conflictOfInterestFile) requiredDocumentCount++;
          if (Array.isArray(t.teacherTrainingFiles) && t.teacherTrainingFiles.length > 0) requiredDocumentCount++;
          if (Array.isArray(t.teacherRecognitionFiles) && t.teacherRecognitionFiles.length > 0) requiredDocumentCount++;

          return {
            ...t,
            fullName: fName + ' ' + lName,
            documentInfo: dtype + ' ' + doc,
            email: mail,
            phone: phone,
            supervisionType: t.supervisionType || '-',
            contractType: t.contractType || '-',
            files: `${requiredDocumentCount} de 5`
          };
        });

        this.allTeachers = mappedData;
        this.supervisionOptions = Array.from(new Set(mappedData.map((t: any) => t.supervisionType).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
        this.contractOptions = Array.from(new Set(mappedData.map((t: any) => t.contractType).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
        this.teachers.set(mappedData);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching teachers', err)
    });
  }

  editTeacher(teacher: any) {
    this.router.navigate(['/teachers', teacher.id, 'edit']);
  }

  toggleTeacherState(teacher: any) {
    const nextState = teacher.state === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextState === 'ACTIVE' ? 'activar' : 'inactivar';

    if (!confirm(`¿Seguro que deseas ${actionLabel} a este docente?`)) {
      return;
    }

    this.teacherService.updateTeacherState(teacher.id, nextState).subscribe({
      next: () => {
        this.ns.success(`Docente ${nextState === 'ACTIVE' ? 'activado' : 'inactivado'} correctamente`);
        this.loadTeachers();
      },
      error: (err) => this.ns.error('Error al actualizar: ' + (err.error?.message || err.message))
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
    this.loadTeachers();
  }

  downloadTemplate() {
    this.teacherService.downloadTemplate().subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_docentes.xlsx';
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
    this.teacherService.uploadBulk(this.selectedFile).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadResult = res;

        if (res.failed > 0) {
          this.ns.error(`La carga terminó con ${res.failed} fila(s) con error. Revisa el detalle en el modal.`);
        } else {
          this.ns.success('Carga masiva de docentes exitosa.');
        }

        this.loadTeachers();
      },
      error: (err) => {
        this.isUploading = false;
        const message = this.getErrorMessage(err);
        this.uploadResult = {
          total: 0,
          success: 0,
          failed: 1,
          errors: [{ row: 0, message }],
        };
        this.ns.error('Error en la carga: ' + message);
      }
    });
  }

  private getErrorMessage(err: any) {
    const message = err?.error?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return err?.message || 'Error en servidor';
  }
}
