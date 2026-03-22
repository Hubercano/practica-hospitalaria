import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { InstitutionService } from '../../services/institution.service';
import { NotificationService } from '../../../shared/notification/notification.service';

// UI Components
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { TableComponent, Column } from '../../../shared/ui/table/table.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-institutions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, ModalComponent, TableComponent, FileUploadComponent],
  templateUrl: './institutions-list.component.html',
})
export class InstitutionsListComponent implements OnInit {
  institutions: any[] = [];

  columns: Column[] = [
    { key: 'name', label: 'NOMBRE' },
    { key: 'nit', label: 'NIT' },
    { key: 'type', label: 'TIPO', type: 'badge' },
    { key: 'status', label: 'ESTADO', type: 'status' },
    { key: 'actions', label: 'ACCIONES', type: 'actions' }
  ];

  // Bulk Upload State
  showUploadModal = false;
  isUploading = false;
  uploadResult: any = null;
  selectedFile: File | null = null;

  constructor(
    private service: InstitutionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ns: NotificationService
  ) {}

  ngOnInit() {
    this.service.getInstitutions().subscribe({
      next: (data) => {
        this.institutions = Array.isArray(data) ? data : (data as any).data || [];
        // Map data to ensure tags match UI expectations
        this.institutions = this.institutions.map(inst => ({
            ...inst,
            type: inst.type?.name || inst.type || 'universidades',
            status: inst.status || 'Pendiente'
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando instituciones:', err)
    });
  }

  onEdit(item: any) {
    this.router.navigate(['/institutions', item.id]);
  }

  onDelete(item: any) {
    if (!confirm('¿Seguro que desea eliminar esta institución y todos sus documentos cargados?')) return;

    this.service.deleteInstitution(item.id).subscribe({
      next: () => {
        this.ngOnInit();
      },
      error: (err) => this.ns.error('Error al eliminar: ' + (err.error?.message || err.message))
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
    this.ngOnInit();
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
      },
      error: (err) => {
        this.isUploading = false;
        this.ns.error('Error en la carga: ' + (err.error?.message || err.message));
      }
    });
  }
}
