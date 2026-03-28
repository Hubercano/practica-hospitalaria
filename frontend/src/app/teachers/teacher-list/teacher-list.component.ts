import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TeacherService, Teacher } from '../teacher.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { FileUploadComponent } from '../../shared/ui/file-upload/file-upload.component';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, CardComponent, ModalComponent, FileUploadComponent],
  templateUrl: './teacher-list.component.html'
})
export class TeacherListComponent implements OnInit {
  // Fix reactivity by using Signals
  teachers = signal<any[]>([]);

  showUploadModal = false;
  isUploading = false;
  uploadResult: any = null;
  selectedFile: File | null = null;


  constructor(private teacherService: TeacherService, private router: Router, private ns: NotificationService) {}

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

        this.teachers.set(mappedData);
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
        this.ns.success('Carga masiva de docentes exitosa.');
        this.closeUploadModal();
      },
      error: (err) => {
        this.isUploading = false;
        this.ns.error('Error en la carga: ' + (err.error?.message || err.message));
      }
    });
  }
}
