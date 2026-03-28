import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ServiceCapacityService } from '../../../core/services/service-capacity.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ServiceCapacity } from '../../../core/models/service-capacity.model';
import { exportToExcel } from '../../../shared/utils/excel-export.util';
import { FilterChipsComponent, FilterChip } from '../../../shared/ui/filter-chips/filter-chips.component';

import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-service-capacity-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule, TableComponent, ButtonComponent, ModalComponent, FileUploadComponent, FilterChipsComponent],
  templateUrl: './service-capacity-list.component.html'})
export class ServiceCapacityListComponent implements OnInit {
  capacities = signal<any[]>([]);
  allCapacities: any[] = [];

  showFilters = false;
  filtersForm: FormGroup;
  groupOptions: string[] = [];
  conceptOptions: string[] = [];

  showUploadModal = false;
  selectedFile: File | null = null;
  isUploading = false;
  uploadResult: any = null;

  columns: Column[] = [
    { key: 'headquarters', label: 'Sede' },
    { key: 'headquartersName', label: 'Nombre Sede' },
    { key: 'capacityGroup', label: 'Grupo' },
    { key: 'concept', label: 'Concepto' },
    { key: 'capacityQuantity', label: 'Cantidad' },
    { key: 'servicesList', label: 'Servicios Asignados' },
    { key: 'actions', label: 'Acciones', type: 'actions' }
  ];

  private service = inject(ServiceCapacityService);
  private router = inject(Router);
  private ns = inject(NotificationService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.filtersForm = this.fb.group({
      headquarters: [''],
      headquartersName: [''],
      groups: [[]],
      concept: [''],
      quantity: ['']
    });
  }

  get activeChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const form = this.filtersForm.value;
    (form.groups || []).forEach((v: string) => {
      chips.push({ id: `group-${v}`, controlName: 'groups', label: v, value: v, fieldLabel: 'Grupo' });
    });
    return chips;
  }

  removeChip(chip: FilterChip): void {
    const ctrl = this.filtersForm.get(chip.controlName);
    if (ctrl) {
      ctrl.setValue((ctrl.value || []).filter((v: any) => v !== chip.value));
      this.applyFilters();
    }
  }

  toggleFiltersPanel() { this.showFilters = !this.showFilters; }

  applyFilters() {
    const f = this.filtersForm.value;
    const hq = (f.headquarters || '').trim().toLowerCase();
    const hqName = (f.headquartersName || '').trim().toLowerCase();
    const groups: string[] = f.groups || [];
    const concept = (f.concept || '').trim().toLowerCase();
    const qty = (f.quantity || '').trim();

    this.capacities.set(this.allCapacities.filter(item => {
      const matchHq = !hq || (item.headquarters || '').toLowerCase().includes(hq);
      const matchHqName = !hqName || (item.headquartersName || '').toLowerCase().includes(hqName);
      const matchGroup = !groups.length || groups.includes(item.capacityGroup);
      const matchConcept = !concept || (item.concept || '').toLowerCase().includes(concept);
      const matchQty = !qty || String(item.capacityQuantity || '').includes(qty);
      return matchHq && matchHqName && matchGroup && matchConcept && matchQty;
    }));
  }

  clearFilters() {
    this.filtersForm.reset({ headquarters: '', headquartersName: '', groups: [], concept: '', quantity: '' });
    this.capacities.set([...this.allCapacities]);
  }

  async exportCurrentTableData() {
    const rows = this.capacities();
    if (!rows.length) { this.ns.error('No hay datos para exportar.'); return; }
    await exportToExcel(rows.map(item => ({
      'Sede': item.headquarters ?? '',
      'Nombre Sede': item.headquartersName ?? '',
      'Grupo': item.capacityGroup ?? '',
      'Concepto': item.concept ?? '',
      'Cantidad': item.capacityQuantity ?? '',
      'Servicios Asignados': item.servicesList ?? ''
    })), 'capacidad_instalada', 'Capacidad');
  }

  ngOnInit() {
    this.initialLoad();
  }

  openUploadModal() {
    this.showUploadModal = true;
    this.selectedFile = null;
    this.uploadResult = null;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.isUploading = false;
  }

  onFileSelected(file: File) {
    this.selectedFile = file;
  }

  uploadFile() {
    if (!this.selectedFile) return;
    this.isUploading = true;
    const form = new FormData();
    form.append('file', this.selectedFile);
    this.service.uploadBulk(form).subscribe({
      next: (res) => {
        this.uploadResult = res;
        this.isUploading = false;
        this.initialLoad();
      },
      error: (err) => {
        console.error('Bulk upload error', err);
        this.uploadResult = { total: 0, success: 0, failed: 0, errors: [{ row: 0, message: err.message || 'Error en servidor' }] };
        this.isUploading = false;
      }
    });
  }

  initialLoad() {
    this.service.getAll().subscribe(data => {
      // Map data to create a comma-separated string for the assigned services so it can print on table
      const mapped = data.map(item => {
        let servicesText = 'Sin servicios';
        if (item.services && item.services.length > 0) {
          servicesText = item.services.map((s: any) => s.name).join(', ');
        }
        return {
          ...item,
          servicesList: servicesText
        };
      });
      this.allCapacities = mapped;
      this.groupOptions = Array.from(new Set(mapped.map((i: any) => i.capacityGroup).filter(Boolean))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
      this.capacities.set([...mapped]);
      this.cdr.detectChanges();
    });
  }

  onEdit(item: any) {
    this.router.navigate(['/service-capacity', item.id]);
  }

  delete(id: string) {
    if (!id) return;
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      this.service.delete(id).subscribe({
        next: () => {
          this.initialLoad();
        },
        error: (err) => {
          console.error("Error al eliminar:", err);
          this.ns.error('Hubo un error al intentar eliminar el registro.');
        }
      });
    }
  }
}
