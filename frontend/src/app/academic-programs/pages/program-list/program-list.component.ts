import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AcademicProgramsService } from '../../../core/services/academic-programs.service';
import { AcademicProgram } from '../../../core/models/academic-program.model';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent, Column } from '../../../shared/ui/table/table.component';

@Component({
  selector: 'app-program-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, TableComponent],
  templateUrl: './program-list.component.html'})
export class ProgramListComponent implements OnInit {
  programs = signal<AcademicProgram[]>([]);

  columns: Column[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'level', label: 'Nivel', type: 'badge' },
    { key: 'institution', label: 'Institución' },
    { key: 'actions', label: 'Acciones', type: 'actions' }
  ];

  constructor(private service: AcademicProgramsService, private router: Router) {}

  onEdit(item: any) {
    this.router.navigate(['/academic-programs', item.id]);
  }

  ngOnInit() {
    this.loadPrograms();
  }

  loadPrograms() {
    this.service.getAll().subscribe({
      next: (data) => {
        const mappedData = data.map(program => ({
          ...program,
          institution: program.institution?.name || '-'
        }));
        this.programs.set(mappedData);
      },
      error: (err) => console.error('Error loading programs', err)
    });
  }
}
