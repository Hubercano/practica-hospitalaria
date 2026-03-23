import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TeacherService, Teacher } from '../teacher.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { TableComponent, Column } from '../../shared/ui/table/table.component';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, TableComponent, CardComponent],
  templateUrl: './teacher-list.component.html'
})
export class TeacherListComponent implements OnInit {
  // Fix reactivity by using Signals
  teachers = signal<any[]>([]);

  columns: Column[] = [
    { key: 'fullName', label: 'Nombre Completo' },
    { key: 'documentInfo', label: 'Documento' },
    { key: 'contact', label: 'Contacto' },
    { key: 'supervisionType', label: 'Supervisión' },
    { key: 'contractType', label: 'Contratación' },
    { key: 'files', label: 'Documentos' },
    { key: 'actions', label: 'Acciones', type: 'actions' }
  ];

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

          let fileCount = 0;
          if (t.cvFile) fileCount++;
          if (t.dataAuthorizationFile) fileCount++;
          if (t.conflictOfInterestFile) fileCount++;

          return {
            ...t,
            fullName: fName + ' ' + lName,
            documentInfo: dtype + ' ' + doc,
            contact: mail + ' / ' + phone,
            supervisionType: t.supervisionType || '-',
            contractType: t.contractType || '-',
            files: fileCount + ' cargados'
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

  deleteTeacher(id: string) {
    if (confirm('¿Seguro que desea eliminar a este docente?')) {
      this.teacherService.deleteTeacher(id).subscribe({
        next: () => this.loadTeachers(),
        error: (err) => this.ns.error('Error al eliminar: ' + (err.error?.message || err.message))
      });
    }
  }
}
