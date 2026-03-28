import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';
import { ClinicalServicesService } from '../../../core/services/clinical-services.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ClinicalService } from '../../../core/models/clinical-service.model';
import { exportToExcel } from '../../../shared/utils/excel-export.util';
import { FilterChipsComponent, FilterChip } from '../../../shared/ui/filter-chips/filter-chips.component';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule, ButtonComponent, TableComponent, ModalComponent, FileUploadComponent, FilterChipsComponent],
  templateUrl: './service-list.component.html'})
export class ServiceListComponent implements OnInit {
  services = signal<any[]>([]);
  allServices: any[] = [];

  showFilters = false;
  filtersForm: FormGroup;
  venueOptions: string[] = [];
  stateOptions = [
    { label: 'Activo', value: 'Activo' },
    { label: 'Inactivo', value: 'Inactivo' }
  ];

  columns: Column[] = [
    { key: 'code', label: 'CÓDIGO' },
    { key: 'name', label: 'NOMBRE' },
    { key: 'venueName', label: 'SEDE' },
    { key: 'venueSequence', label: 'SEC. SEDE' },
    { key: 'venueCode', label: 'CÓD. SEDE' },
    { key: 'status', label: 'ESTADO', type: 'status' },
    { key: 'actions', label: 'ACCIONES', type: 'actions' }
  ];

  showUploadModal = false;
  isUploading = false;
  uploadResult: any = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private service: ClinicalServicesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ns: NotificationService
  ) {
    this.filtersForm = this.fb.group({
      code: [''],
      name: [''],
      venues: [[]],
      venueSequence: [''],
      venueCode: [''],
      states: [[]]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.service.getAll().subscribe({
      next: (data: ClinicalService[]) => {
        const mappedData = data.map(item => ({
          ...item,
          status: item.isActive ? 'Activo' : 'Inactivo',
          venueName: item.venueName || '-',
          venueSequence: item.venueSequence || '-',
          venueCode: item.venueCode || '-',
        }));
        this.allServices = mappedData;
        this.buildFilterOptions();

        if (this.hasActiveFilters()) {
          this.applyFilters();
        } else {
          this.services.set([...this.allServices]);
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading clinical services', err)
    });
  }

  get activeChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const form = this.filtersForm.value;

    (form.venues || []).forEach((v: string) => {
      chips.push({ id: `venues-${v}`, controlName: 'venues', label: v, value: v, fieldLabel: 'Sede' });
    });
    (form.states || []).forEach((v: string) => {
      chips.push({ id: `state-${v}`, controlName: 'states', label: v, value: v, fieldLabel: 'Estado' });
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

  toggleFiltersPanel() {
    this.showFilters = !this.showFilters;
  }

  applyFilters() {
    const formValue = this.filtersForm.value;

    const code = (formValue.code || '').trim().toLowerCase();
    const name = (formValue.name || '').trim().toLowerCase();
    const venues: string[] = formValue.venues || [];
    const venueSequence = (formValue.venueSequence || '').trim().toLowerCase();
    const venueCode = (formValue.venueCode || '').trim().toLowerCase();
    const states: string[] = formValue.states || [];

    const filtered = this.allServices.filter((item) => {
      const itemVenueName = (item.venueName || '').toString();
      const itemVenueSequence = (item.venueSequence || '').toString();
      const itemVenueCode = (item.venueCode || '').toString();

      const matchesCode = !code || (item.code || '').toLowerCase().includes(code);
      const matchesName = !name || (item.name || '').toLowerCase().includes(name);
      const matchesVenue = !venues.length || venues.includes(itemVenueName);
      const matchesVenueSequence = !venueSequence || itemVenueSequence.toLowerCase().includes(venueSequence);
      const matchesVenueCode = !venueCode || itemVenueCode.toLowerCase().includes(venueCode);
      const matchesState = !states.length || states.includes(item.status);

      return matchesCode && matchesName && matchesVenue && matchesVenueSequence && matchesVenueCode && matchesState;
    });

    this.services.set(filtered);
  }

  clearFilters() {
    this.filtersForm.reset({
      code: '',
      name: '',
      venues: [],
      venueSequence: '',
      venueCode: '',
      states: []
    });
    this.services.set([...this.allServices]);
  }

  async exportCurrentTableData() {
    const currentRows = this.services() || [];

    if (!currentRows.length) {
      this.ns.error('No hay datos para exportar con los filtros actuales.');
      return;
    }

    const exportRows = currentRows.map((item) => ({
      'Código': item.code ?? '',
      'Nombre': item.name ?? '',
      'Sede': item.venueName ?? '',
      'Sec. Sede': item.venueSequence ?? '',
      'Cód. Sede': item.venueCode ?? '',
      'Estado': item.status ?? '',
    }));

    await exportToExcel(exportRows, 'servicios_filtrados', 'Servicios');
  }

  private buildFilterOptions() {
    this.venueOptions = Array.from(
      new Set(this.allServices.map((item) => item.venueName).filter((name) => !!name && name !== '-'))
    ).sort((a, b) => a.localeCompare(b));
  }

  private hasActiveFilters(): boolean {
    const formValue = this.filtersForm.value;
    return !!(
      (formValue.code && formValue.code.trim()) ||
      (formValue.name && formValue.name.trim()) ||
      (formValue.venues && formValue.venues.length) ||
      (formValue.venueSequence && formValue.venueSequence.trim()) ||
      (formValue.venueCode && formValue.venueCode.trim()) ||
      (formValue.states && formValue.states.length)
    );
  }

  onEdit(item: any) {
    this.router.navigate(['/clinical-services', item.id]);
  }

  onDelete(item: any) {
    if (confirm('¿Seguro que desea eliminar este servicio?')) {
      this.service.delete(item.id).subscribe({
        next: () => this.loadData(),
        error: (err) => this.ns.error('Error al eliminar: ' + (err.error?.message || err.message))
      });
    }
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
    this.service.downloadTemplate().subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_servicios_clinicos.xlsx';
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
        // Refresh the services list so newly uploaded records are visible
        this.loadData();
      },
      error: (err) => {
        this.isUploading = false;
        this.ns.error('Error en la carga: ' + (err.error?.message || err.message));
      }
    });
  }
}
