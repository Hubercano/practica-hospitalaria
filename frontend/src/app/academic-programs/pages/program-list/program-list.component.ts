import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AcademicProgramsService } from '../../../core/services/academic-programs.service';
import { AcademicProgram } from '../../../core/models/academic-program.model';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NotificationService } from '../../../shared/notification/notification.service';
import { exportToExcel } from '../../../shared/utils/excel-export.util';
import { FilterChipsComponent, FilterChip } from '../../../shared/ui/filter-chips/filter-chips.component';

@Component({
  selector: 'app-program-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule, ButtonComponent, FilterChipsComponent],
  templateUrl: './program-list.component.html'})
export class ProgramListComponent implements OnInit {
  programs = signal<any[]>([]);
  allPrograms: any[] = [];

  showFilters = false;
  filtersForm: FormGroup;
  levelOptions: string[] = [];
  institutionOptions: string[] = [];
  stateOptions = [
    { label: 'Activo', value: 'ACTIVE' },
    { label: 'Inactivo', value: 'INACTIVE' }
  ];

  constructor(
    private service: AcademicProgramsService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ns: NotificationService
  ) {
    this.filtersForm = this.fb.group({
      name: [''],
      levels: [[]],
      institutions: [[]],
      areasText: [''],
      states: [[]]
    });
  }

  get activeChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const f = this.filtersForm.value;
    (f.levels || []).forEach((v: string) => chips.push({ id: `lvl-${v}`, controlName: 'levels', label: v, value: v, fieldLabel: 'Nivel' }));
    (f.institutions || []).forEach((v: string) => chips.push({ id: `inst-${v}`, controlName: 'institutions', label: v, value: v, fieldLabel: 'Institución' }));
    (f.states || []).forEach((v: string) => {
      const label = this.stateOptions.find(o => o.value === v)?.label ?? v;
      chips.push({ id: `st-${v}`, controlName: 'states', label, value: v, fieldLabel: 'Estado' });
    });
    return chips;
  }

  removeChip(chip: FilterChip): void {
    const ctrl = this.filtersForm.get(chip.controlName);
    if (ctrl) { ctrl.setValue((ctrl.value || []).filter((v: any) => v !== chip.value)); this.applyFilters(); }
  }

  toggleFiltersPanel() { this.showFilters = !this.showFilters; }

  applyFilters() {
    const f = this.filtersForm.value;
    const name = (f.name || '').trim().toLowerCase();
    const levels: string[] = f.levels || [];
    const institutions: string[] = f.institutions || [];
    const areasText = (f.areasText || '').trim().toLowerCase();
    const states: string[] = f.states || [];

    this.programs.set(this.allPrograms.filter(item => {
      const matchName = !name || (item.name || '').toLowerCase().includes(name);
      const matchLevel = !levels.length || levels.includes(item.level);
      const matchInstitution = !institutions.length || institutions.includes(item.institution);
      const matchAreas = !areasText || (item.areasSummary || '').toLowerCase().includes(areasText);
      const matchState = !states.length || states.includes(item.state);
      return matchName && matchLevel && matchInstitution && matchAreas && matchState;
    }));
  }

  clearFilters() {
    this.filtersForm.reset({ name: '', levels: [], institutions: [], areasText: '', states: [] });
    this.programs.set([...this.allPrograms]);
  }

  async exportCurrentTableData() {
    const rows = this.programs();
    if (!rows.length) { this.ns.error('No hay datos para exportar.'); return; }
    await exportToExcel(rows.map(item => ({
      'Nombre': item.name ?? '',
      'Nivel': item.level ?? '',
      'Institución': item.institution ?? '',
      'Áreas': item.areasSummary ?? '',
      'Estado': item.stateLabel ?? ''
    })), 'programas_academicos', 'Programas');
  }

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
        this.allPrograms = mappedData;
        this.levelOptions = Array.from(new Set(mappedData.map((p: any) => p.level).filter(Boolean))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
        this.institutionOptions = Array.from(new Set(mappedData.map((p: any) => p.institution).filter((v: any) => !!v && v !== '-'))).sort((a: any, b: any) => a.localeCompare(b)) as string[];
        this.programs.set(mappedData);
        this.cdr.detectChanges();
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
