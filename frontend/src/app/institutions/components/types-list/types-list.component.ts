import { Component, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InstitutionService } from '../../services/institution.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { Observable, catchError, of } from 'rxjs';

@Component({
  selector: 'app-types-list',
  standalone: true,
  imports: [CommonModule, RouterModule, AsyncPipe, ButtonComponent],
  templateUrl: './types-list.component.html',
  styleUrls: ['./types-list.component.css'],
})
export class TypesListComponent implements OnInit {
  types$: Observable<any[]> = of([]); // Fixed type to any temporarily as InstitutionType import seemed broken in prev file read or I missed it
  errorMessage = '';

  constructor(private service: InstitutionService, private ns: NotificationService) {}

  ngOnInit() {
    this.types$ = this.service.getTypes().pipe(
      catchError(err => {
        this.errorMessage = 'Error al cargar tipos: ' + err.message;
        console.error(err);
        return of([]);
      })
    );
  }

  deleteType(id: string) {
    if (!confirm('¿Estás seguro de eliminar este tipo? Se borrará si no tiene instituciones activas.')) return;
    this.service.deleteType(id).subscribe({
      next: () => this.ngOnInit(), // Re-trigger the observable or reload page
      error: (err) => {
        this.ns.error('Error al eliminar: ' + (err.error?.message || err.message));
        console.error(err);
      }
    });
  }
}

