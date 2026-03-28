import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { InstitutionService } from '../../services/institution.service';
import { NotificationService } from '../../../shared/notification/notification.service';

// UI Components
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-institutions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, ModalComponent, FileUploadComponent],
  templateUrl: './institutions-list.component.html',
})
export class InstitutionsListComponent implements OnInit {
  institutions: any[] = [];

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
    this.service.getInstitutions(true).subscribe({
      next: (data) => {
        this.institutions = Array.isArray(data) ? data : (data as any).data || [];
        this.institutions = this.institutions.map(inst => ({
            ...inst,
            type: inst.type?.name || inst.type || 'universidades',
            requirementStatus: inst.status || 'PENDIENTE',
            institutionStateLabel: inst.state === 'ACTIVE' ? 'Activa' : 'Inactiva'
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando instituciones:', err)
    });
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
        this.ngOnInit();
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
