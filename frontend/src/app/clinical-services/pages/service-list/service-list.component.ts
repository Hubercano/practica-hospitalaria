import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';
import { ClinicalServicesService } from '../../../core/services/clinical-services.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ClinicalService } from '../../../core/models/clinical-service.model';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, TableComponent, ModalComponent, FileUploadComponent],
  templateUrl: './service-list.component.html'})
export class ServiceListComponent implements OnInit {
  services = signal<any[]>([]);

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
    private service: ClinicalServicesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ns: NotificationService
  ) {}

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
        this.services.set(mappedData);
      },
      error: (err: any) => console.error('Error loading clinical services', err)
    });
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
