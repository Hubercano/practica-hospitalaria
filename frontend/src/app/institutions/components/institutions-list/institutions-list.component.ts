import { Component, OnInit, ChangeDetectorRef, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '../../../auth/auth.service';
import { InstitutionService } from '../../services/institution.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { exportToExcel } from '../../../shared/utils/excel-export.util';
import { FilterChipsComponent, FilterChip } from '../../../shared/ui/filter-chips/filter-chips.component';

// UI Components
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-institutions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule, ButtonComponent, ModalComponent, FileUploadComponent, FilterChipsComponent],
  templateUrl: './institutions-list.component.html',
})
export class InstitutionsListComponent implements OnInit {
  institutions: any[] = [];
  allInstitutions: any[] = [];

  showFilters = false;
  filtersForm: FormGroup;

  typeOptions: string[] = [];
  requirementStatusOptions: string[] = [];
  stateOptions = [
    { label: 'Activa', value: 'ACTIVE' },
    { label: 'Inactiva', value: 'INACTIVE' }
  ];

  // Bulk Upload State
  showUploadModal = false;
  isUploading = false;
  uploadResult: any = null;
  selectedFile: File | null = null;

  private authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;
  readonly isInstitutionUser = computed(() => this.currentUser()?.role === 'INSTITUCION');

  constructor(
    private fb: FormBuilder,
    private service: InstitutionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ns: NotificationService
  ) {
    this.filtersForm = this.fb.group({
      name: [''],
      nit: [''],
      types: [[]],
      requirementStatuses: [[]],
      states: [[]]
    });
  }

  ngOnInit() {
    this.loadInstitutions();
  }

  private loadInstitutions() {
    this.service.getInstitutions(true).subscribe({
      next: (data) => {
        const mapped = (Array.isArray(data) ? data : (data as any).data || []).map((inst: any) => ({
            ...inst,
            type: inst.type?.name || inst.type || 'universidades',
            requirementStatus: inst.status || 'PENDIENTE',
            institutionStateLabel: inst.state === 'ACTIVE' ? 'Activa' : 'Inactiva'
        }));

        this.allInstitutions = mapped;
        this.buildFilterOptions();

        if (this.hasActiveFilters()) {
          this.applyFilters();
        } else {
          this.institutions = [...this.allInstitutions];
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando instituciones:', err)
    });
  }

  toggleFiltersPanel() {
    this.showFilters = !this.showFilters;
  }

  applyFilters() {
    const formValue = this.filtersForm.value;

    const name = (formValue.name || '').trim().toLowerCase();
    const nit = (formValue.nit || '').trim().toLowerCase();
    const types: string[] = formValue.types || [];
    const requirementStatuses: string[] = formValue.requirementStatuses || [];
    const states: string[] = formValue.states || [];

    this.institutions = this.allInstitutions.filter((inst) => {
      const matchesName = !name || (inst.name || '').toLowerCase().includes(name);
      const matchesNit = !nit || String(inst.nit || '').toLowerCase().includes(nit);
      const matchesType = !types.length || types.includes(inst.type);
      const matchesRequirementStatus = !requirementStatuses.length || requirementStatuses.includes(inst.requirementStatus);
      const matchesState = !states.length || states.includes(inst.state);

      return matchesName && matchesNit && matchesType && matchesRequirementStatus && matchesState;
    });
  }

  clearFilters() {
    this.filtersForm.reset({
      name: '',
      nit: '',
      types: [],
      requirementStatuses: [],
      states: []
    });
    this.institutions = [...this.allInstitutions];
  }

  private buildFilterOptions() {
    this.typeOptions = Array.from(new Set(this.allInstitutions.map((i) => i.type).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    this.requirementStatusOptions = Array.from(new Set(this.allInstitutions.map((i) => i.requirementStatus).filter(Boolean)));
  }

  get activeChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const form = this.filtersForm.value;

    (form.types || []).forEach((v: string) => {
      chips.push({ id: `types-${v}`, controlName: 'types', label: v, value: v, fieldLabel: 'Tipo' });
    });
    (form.requirementStatuses || []).forEach((v: string) => {
      chips.push({ id: `req-${v}`, controlName: 'requirementStatuses', label: v, value: v, fieldLabel: 'Estado Req.' });
    });
    (form.states || []).forEach((v: string) => {
      const label = this.stateOptions.find(o => o.value === v)?.label ?? v;
      chips.push({ id: `state-${v}`, controlName: 'states', label, value: v, fieldLabel: 'Estado' });
    });

    return chips;
  }

  removeChip(chip: FilterChip): void {
    const control = this.filtersForm.get(chip.controlName);
    if (control) {
      const current: any[] = control.value || [];
      control.setValue(current.filter((v: any) => v !== chip.value));
      this.applyFilters();
    }
  }

  private hasActiveFilters(): boolean {
    const formValue = this.filtersForm.value;
    return !!(
      (formValue.name && formValue.name.trim()) ||
      (formValue.nit && formValue.nit.trim()) ||
      (formValue.types && formValue.types.length) ||
      (formValue.requirementStatuses && formValue.requirementStatuses.length) ||
      (formValue.states && formValue.states.length)
    );
  }

  async exportCurrentTableData() {
    const currentRows = this.institutions || [];

    if (!currentRows.length) {
      this.ns.error('No hay datos para exportar con los filtros actuales.');
      return;
    }

    const exportRows = currentRows.map((item) => ({
      'Nombre': item.name ?? '',
      'NIT': item.nit ?? '',
      'Tipo de institución': item.type ?? '',
      'Correo': item.email ?? '',
      'Teléfono': item.phone ?? '',
      'Dirección': item.address ?? '',
      'Estado de requisitos': item.requirementStatus ?? '',
      'Estado': item.institutionStateLabel ?? (item.state === 'ACTIVE' ? 'Activa' : 'Inactiva'),
    }));

    await exportToExcel(exportRows, 'instituciones_filtradas', 'Instituciones');
  }

  onViewDetails(item: any) {
    this.router.navigate(['/institutions', item.id]);
  }

  onEdit(item: any) {
    this.router.navigate(['/institutions', item.id, 'edit']);
  }

  onToggleState(item: any) {
    const isActive = item.state === 'ACTIVE';
    const nextState = isActive ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = isActive ? 'inactivar' : 'activar';
    if (!confirm(`¿Seguro que deseas ${actionLabel} esta institución?`)) return;

    this.service.updateInstitutionState(item.id, nextState).subscribe({
      next: () => {
        this.ns.success(`Institución ${isActive ? 'inactivada' : 'activada'} correctamente`);
        this.loadInstitutions();
      },
      error: (err) => this.ns.error('Error al actualizar estado: ' + (err.error?.message || err.message))
    });
  }

  // Bulk Upload Methods
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
    this.loadInstitutions();
  }

  downloadTemplate() {
    this.service.downloadTemplate().subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_instituciones.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  onFileSelected(file: File) {
    if (file) {
      this.selectedFile = file;
    } else {
      this.selectedFile = null;
    }
  }

  uploadFile() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.service.uploadBulk(this.selectedFile).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadResult = res;
        this.ns.success('Carga masiva exitosa. Listado actualizado.');
        this.closeUploadModal();
      },
      error: (err) => {
        this.isUploading = false;
        this.ns.error('Error en la carga: ' + (err.error?.message || err.message));
      }
    });
  }
}
