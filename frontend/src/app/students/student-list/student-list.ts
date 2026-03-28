import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { StudentsService } from '../students.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './student-list.html',
  styleUrls: ['./student-list.css']
})
export class StudentList implements OnInit {
  // Use signal instead of plain array to work with Angular 19 Reactivity
  students = signal<any[]>([]);

  private studentsService = inject(StudentsService);
  private router = inject(Router);
  private ns = inject(NotificationService);

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.studentsService.getStudents(true).subscribe({
      next: (data) => {
        const rawData = Array.isArray(data) ? data : [];
        
        // Map backend schema to match table columns
        const mappedData = rawData.map((s: any) => {
           const firstName = s.firstName ? s.firstName : '';
           const lastName = s.lastName ? s.lastName : '';
           return {
              ...s,
              name: firstName + ' ' + lastName, // Avoid PS string escaping issues
              institutionName: s.institution?.name || '-',
              studentType: s.type ? s.type.name : '-',
              status: s.status || 'PENDIENTE',
              stateLabel: s.state === 'ACTIVE' ? 'Activo' : 'Inactivo'
           };
        });
        
        this.students.set(mappedData);
      },
      error: (err) => console.error('Error fetching students', err)
    });
  }

  onViewDetail(item: any) {
    this.router.navigate(['/students', item.id]);
  }

  onEdit(item: any) {
    this.router.navigate(['/students', item.id, 'edit']);
  }

  onToggleState(item: any) {
    const isActive = item.state === 'ACTIVE';
    const nextState = isActive ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = isActive ? 'inactivar' : 'activar';

    if (!confirm(`¿Seguro que deseas ${actionLabel} este estudiante?`)) {
      return;
    }

    this.studentsService.updateStudentState(item.id, nextState).subscribe({
      next: () => {
        this.ns.success(`Estudiante ${isActive ? 'inactivado' : 'activado'} correctamente`);
        this.loadData();
      },
      error: (err) => this.ns.error('Error al actualizar estado: ' + (err.error?.message || err.message))
    });
  }
}
