import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { StudentsService, Student } from '../students.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { TableComponent, Column } from '../../shared/ui/table/table.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableComponent, ButtonComponent],
  templateUrl: './student-list.html',
  styleUrls: ['./student-list.css']
})
export class StudentList implements OnInit {
  // Use signal instead of plain array to work with Angular 19 Reactivity
  students = signal<any[]>([]);

  studentsColumns: Column[] = [
    { key: 'document', label: 'Documento' },
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'studentType', label: 'Tipo' },
    { key: 'status', label: 'Estado Requisitos', type: 'status' },
    { key: 'actions', label: 'Acciones', type: 'actions' }
  ];

  private studentsService = inject(StudentsService);
  private router = inject(Router);
  private ns = inject(NotificationService);

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.studentsService.getStudents().subscribe({
      next: (data) => {
        const rawData = Array.isArray(data) ? data : [];
        
        // Map backend schema to match table columns
        const mappedData = rawData.map((s: any) => {
           const firstName = s.firstName ? s.firstName : '';
           const lastName = s.lastName ? s.lastName : '';
           return {
              ...s,
              name: firstName + ' ' + lastName, // Avoid PS string escaping issues
              studentType: s.type ? s.type.name : '-',
              status: s.status || 'Pendiente'
           };
        });
        
        this.students.set(mappedData);
      },
      error: (err) => console.error('Error fetching students', err)
    });
  }

  onEdit(item: any) {
    this.router.navigate(['/students', item.id]);
  }

  onDelete(item: any) {
    if (confirm('¿Seguro que desea eliminar a este estudiante?')) {
      this.studentsService.deleteStudent(item.id).subscribe({
        next: () => this.loadData(),
        error: (err) => this.ns.error('Error al eliminar: ' + (err.error?.message || err.message))
      });
    }
  }
}
