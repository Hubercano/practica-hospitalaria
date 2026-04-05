import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SurveysService, Survey } from '../../services/surveys.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-survey-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './survey-list.component.html',
  styleUrl: './survey-list.component.css',
})
export class SurveyListComponent implements OnInit {
  surveys = signal<Survey[]>([]);
  loading = signal(false);

  private readonly surveysService = inject(SurveysService);
  private readonly ns = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  filterForm = this.fb.group({
    status: [''],
  });

  ngOnInit() {
    this.loadSurveys();
  }

  loadSurveys() {
    const status = this.filterForm.value.status as 'ACTIVE' | 'INACTIVE' | '';
    this.loading.set(true);
    this.surveysService.getSurveys(status || undefined).subscribe({
      next: (data) => {
        this.surveys.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.ns.error('No fue posible cargar las encuestas: ' + (err?.error?.message || err?.message || 'Error desconocido'));
      },
    });
  }

  createSurvey() {
    this.router.navigate(['/surveys/new']);
  }

  editSurvey(item: Survey) {
    this.router.navigate(['/surveys', item.id, 'edit']);
  }

  openResults(item: Survey) {
    this.router.navigate(['/surveys', item.id, 'results']);
  }

  publishSurvey(item: Survey) {
    this.surveysService.publishSurvey(item.id).subscribe({
      next: () => {
        this.ns.success('Encuesta publicada correctamente');
        this.loadSurveys();
      },
      error: (err) => this.ns.error(err?.error?.message || 'No se pudo publicar la encuesta'),
    });
  }

  removeSurvey(item: Survey) {
    if (!confirm(`¿Deseas eliminar la encuesta "${item.name}"?`)) return;

    this.surveysService.deleteSurvey(item.id).subscribe({
      next: () => {
        this.ns.success('Encuesta eliminada');
        this.loadSurveys();
      },
      error: (err) => this.ns.error(err?.error?.message || 'No se pudo eliminar la encuesta'),
    });
  }

  getOpenAccessLink(item: Survey) {
    return this.surveysService.getOpenAccessLink(item.id);
  }

  async copyOpenAccessLink(item: Survey) {
    const link = this.getOpenAccessLink(item);
    const copied = await this.copyText(link);

    if (copied) {
      this.ns.success('Link público copiado al portapapeles');
      return;
    }

    this.ns.error('No fue posible copiar el link automáticamente.');
  }

  private async copyText(value: string): Promise<boolean> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Fallback below.
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}
