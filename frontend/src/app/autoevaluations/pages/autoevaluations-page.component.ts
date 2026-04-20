import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { InstitutionService } from '../../institutions/services/institution.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import {
  AutoevaluationProcessListItem,
  AutoevaluationsService,
} from '../services/autoevaluations.service';

@Component({
  selector: 'app-autoevaluations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, RouterModule, ButtonComponent],
  templateUrl: './autoevaluations-page.component.html',
})
export class AutoevaluationsPageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly autoevaluationsService = inject(AutoevaluationsService);
  private readonly institutionService = inject(InstitutionService);

  readonly currentUser = this.authService.currentUser;
  readonly isHospital = computed(() => this.currentUser()?.role === 'HOSPITAL');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showFilters = signal(false);

  readonly processes = signal<AutoevaluationProcessListItem[]>([]);

  readonly institutions = signal<Array<{ id: string; name: string }>>([]);

  readonly selectedInstitutionId = signal<string | null>(null);
  readonly filterYear = signal<number | null>(new Date().getFullYear());
  readonly filterPeriod = signal<number | null>(null);

  readonly periodOptions = [1, 2, 3, 4];

  constructor() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading.set(true);
    this.error.set(null);
    this.loadInstitutionsIfNeeded();
    this.refreshProcesses();
  }

  refreshProcesses() {
    this.loading.set(true);
    this.autoevaluationsService
      .listProcesses({
        year: this.filterYear() || undefined,
        period: this.filterPeriod() || undefined,
        institutionId: this.resolveInstitutionForFilter(),
      })
      .subscribe({
        next: (items) => {
          this.processes.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No fue posible cargar los procesos.');
          this.loading.set(false);
        },
      });
  }

  toggleFiltersPanel() {
    this.showFilters.update((value) => !value);
  }

  clearFilters() {
    this.filterYear.set(new Date().getFullYear());
    this.filterPeriod.set(null);
    this.selectedInstitutionId.set(null);
    this.refreshProcesses();
  }

  goToCreateProcess() {
    this.router.navigate(['/autoevaluations/new']);
  }

  goToProcessDetail(process: AutoevaluationProcessListItem) {
    this.router.navigate(['/autoevaluations', process.id]);
  }

  goToProcessEdit(process: AutoevaluationProcessListItem) {
    this.router.navigate(['/autoevaluations', process.id, 'edit']);
  }

  getStatusBadgeClass(status: AutoevaluationProcessListItem['status']) {
    switch (status) {
      case 'APPROVED':
        return 'border-emerald-200 text-emerald-700 bg-emerald-50';
      case 'CLOSED':
        return 'border-slate-300 text-slate-700 bg-slate-100';
      case 'IN_REVIEW':
        return 'border-amber-200 text-amber-700 bg-amber-50';
      case 'SUBMITTED':
        return 'border-blue-200 text-blue-700 bg-blue-50';
      default:
        return 'border-violet-200 text-violet-700 bg-violet-50';
    }
  }

  trackByProcess(_: number, item: AutoevaluationProcessListItem) {
    return item.id;
  }

  private loadInstitutionsIfNeeded() {
    if (!this.isHospital()) {
      return;
    }

    this.institutionService.getInstitutions(true).subscribe({
      next: (institutions) => {
        this.institutions.set(institutions.map((item) => ({ id: item.id, name: item.name })));
      },
      error: () => {
        this.notifications.error('No fue posible cargar las instituciones para el filtro.');
      },
    });
  }

  private resolveInstitutionForFilter() {
    if (!this.isHospital()) {
      return this.currentUser()?.institutionId || undefined;
    }

    return this.selectedInstitutionId() || undefined;
  }
}
