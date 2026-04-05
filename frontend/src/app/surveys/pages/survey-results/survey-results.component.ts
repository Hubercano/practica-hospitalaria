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
  stats = signal<any>(null);
  error = signal('');

  ngOnInit() {
    const surveyId = this.route.snapshot.paramMap.get('id');
    if (!surveyId) {
      this.error.set('Encuesta no válida.');
      this.loading.set(false);
      return;
    }

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
}
