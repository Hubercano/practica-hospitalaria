import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SurveysService } from '../../services/surveys.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-survey-results',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './survey-results.component.html',
  styleUrl: './survey-results.component.css',
})
export class SurveyResultsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly surveysService = inject(SurveysService);

  loading = signal(true);
  downloading = signal(false);
  stats = signal<any>(null);
  error = signal('');
  surveyId = '';

  ngOnInit() {
    const surveyId = this.route.snapshot.paramMap.get('id');
    if (!surveyId) {
      this.error.set('Encuesta no válida.');
      this.loading.set(false);
      return;
    }

    this.surveyId = surveyId;

    this.surveysService.getSurveyStats(surveyId).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No fue posible cargar estadísticas.');
        this.loading.set(false);
      },
    });
  }

  downloadResults() {
    if (!this.surveyId || this.downloading()) {
      return;
    }

    this.downloading.set(true);
    this.surveysService.downloadSurveyResults(this.surveyId).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.error.set('No fue posible generar el archivo de resultados.');
          this.downloading.set(false);
          return;
        }

        const contentDisposition = response.headers.get('content-disposition') || '';
        const match = contentDisposition.match(/filename=([^;]+)/i);
        const fileName = match?.[1]?.replace(/"/g, '') || 'resultados-encuesta.xlsx';

        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No fue posible descargar los resultados.');
        this.downloading.set(false);
      },
    });
  }
}
