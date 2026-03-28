import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TeacherService, Teacher } from '../teacher.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, CardComponent],
  templateUrl: './teacher-list.component.html'
})
export class TeacherListComponent implements OnInit {
  // Fix reactivity by using Signals
  teachers = signal<any[]>([]);


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
}
