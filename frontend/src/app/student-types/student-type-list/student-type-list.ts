import { Component, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudentTypesService, StudentType } from '../student-types.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { Observable, catchError, of } from 'rxjs';

@Component({
  selector: 'app-student-type-list',
  standalone: true,
  imports: [CommonModule, RouterModule, AsyncPipe],
  templateUrl: './student-type-list.html',
  styleUrls: ['./student-type-list.css'],
})
export class StudentTypeList implements OnInit {
  types$: Observable<StudentType[]> = of([]);
  errorMessage = '';

  constructor(private service: StudentTypesService, private ns: NotificationService) {}

  ngOnInit() {
    this.types$ = this.service.getTypes().pipe(
      catchError(err => {
        this.errorMessage = 'Error al cargar tipos de estudiante: ' + err.message;
        console.error(err);
        return of([]);
      })
    );
  }

  deleteType(id: string) {
    if (!confirm('¿Estás seguro de eliminar este tipo? Solo se podrá borrar si no tiene estudiantes activos.')) return;
    this.service.deleteType(id).subscribe({
      next: () => this.ngOnInit(), 
      error: (err) => {
        this.ns.error('Error al eliminar: ' + (err.error?.message || err.message));
        console.error(err);
      }
    });
  }
}

