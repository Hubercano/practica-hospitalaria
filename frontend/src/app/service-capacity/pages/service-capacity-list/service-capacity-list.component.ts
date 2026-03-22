import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ServiceCapacityService } from '../../../core/services/service-capacity.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ServiceCapacity } from '../../../core/models/service-capacity.model';

import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-service-capacity-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableComponent, ButtonComponent, ModalComponent, FileUploadComponent],
  templateUrl: './service-capacity-list.component.html'})
export class ServiceCapacityListComponent implements OnInit {
  capacities = signal<any[]>([]);
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
      this.capacities.set(mapped);
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
