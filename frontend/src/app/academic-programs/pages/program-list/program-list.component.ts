import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AcademicProgramsService } from '../../../core/services/academic-programs.service';
import { AcademicProgram } from '../../../core/models/academic-program.model';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NotificationService } from '../../../shared/notification/notification.service';

@Component({
  selector: 'app-program-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './program-list.component.html'})
export class ProgramListComponent implements OnInit {
  programs = signal<any[]>([]);

  constructor(
    private service: AcademicProgramsService,
    private router: Router,
    private ns: NotificationService
  ) {}

  ngOnInit() {
    this.loadPrograms();
  }

  loadPrograms() {
    this.service.getAll().subscribe({
      next: (data) => {
        const mappedData = data.map((program: AcademicProgram) => ({
          ...program,
          institution: program.institution?.name || '-',
          areasSummary: program.rotationAreas?.length
            ? program.rotationAreas.map(area => area.name).join(', ')
            : '-',
          stateLabel: program.state === 'INACTIVE' ? 'Inactivo' : 'Activo'
        }));
        this.programs.set(mappedData);
      },
      error: (err) => console.error('Error loading programs', err)
    });
  }

  viewDetail(item: any) {
    this.router.navigate(['/academic-programs', item.id]);
  }

  editProgram(item: any) {
    this.router.navigate(['/academic-programs', item.id, 'edit']);
  }

  toggleState(item: any) {
    const nextState = item.state === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextState === 'ACTIVE' ? 'activar' : 'inactivar';

    if (!confirm(`¿Seguro que deseas ${actionLabel} este programa?`)) {
      return;
    }

    this.service.update(item.id, { state: nextState }).subscribe({
      next: () => {
        this.ns.success(`Programa ${nextState === 'ACTIVE' ? 'activado' : 'inactivado'} correctamente`);
        this.loadPrograms();
      },
      error: (err) => this.ns.error('Error al actualizar estado: ' + (err.error?.message || err.message))
    });
  }
}
