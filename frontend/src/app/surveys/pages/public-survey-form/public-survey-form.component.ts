import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SurveysService } from '../../services/surveys.service';

@Component({
  selector: 'app-public-survey-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './public-survey-form.component.html',
  styleUrl: './public-survey-form.component.css',
})
export class PublicSurveyFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly surveysService = inject(SurveysService);
  private readonly fb = inject(FormBuilder);

  token = '';
  surveyId = '';
  mode: 'ASSIGNMENT' | 'OPEN' = 'ASSIGNMENT';
  loading = signal(true);
  sending = signal(false);
  completed = signal(false);
  error = signal('');

  surveyData = signal<any>(null);
  form = this.fb.group({});

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.surveyId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.token && !this.surveyId) {
      this.error.set('Acceso a encuesta inválido.');
      this.loading.set(false);
      return;
    }

    const request$ = this.token
      ? this.surveysService.getPublicSurvey(this.token)
      : this.surveysService.getOpenAccessSurvey(this.surveyId);

    this.mode = this.token ? 'ASSIGNMENT' : 'OPEN';

    request$.subscribe({
      next: (data) => {
        this.surveyData.set(data);
        this.buildForm(data?.survey?.questions || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No fue posible cargar la encuesta.');
        this.loading.set(false);
      },
    });
  }

  private buildForm(questions: any[]) {
    const controls: Record<string, any> = {};

    questions.forEach((q) => {
      if (q.type === 'MULTIPLE_CHOICE') {
        controls[q.id] = [[], q.isRequired ? [Validators.required] : []];
      } else {
        controls[q.id] = ['', q.isRequired ? [Validators.required] : []];
      }
    });

    this.form = this.fb.group(controls);
  }

  toggleMultiOption(questionId: string, optionValue: string, checked: boolean) {
    const current = (this.form.get(questionId)?.value || []) as string[];
    const next = checked
      ? Array.from(new Set([...current, optionValue]))
      : current.filter((x) => x !== optionValue);

    this.form.get(questionId)?.setValue(next);
    this.form.get(questionId)?.markAsTouched();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const questions = this.surveyData()?.survey?.questions || [];
    const answers = questions.map((q: any) => {
      const value = this.form.get(q.id)?.value;

      if (q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT') {
        return { questionId: q.id, answerText: value || '' };
      }

      if (q.type === 'SCALE') {
        return { questionId: q.id, answerNumber: value !== '' ? Number(value) : undefined };
      }

      if (q.type === 'SINGLE_CHOICE' || q.type === 'DROPDOWN') {
        return { questionId: q.id, answerOptions: value ? [value] : [] };
      }

      return { questionId: q.id, answerOptions: Array.isArray(value) ? value : [] };
    });

    this.sending.set(true);
    const submit$ = this.mode === 'ASSIGNMENT'
      ? this.surveysService.submitPublicSurvey(this.token, { answers })
      : this.surveysService.submitOpenAccessSurvey(this.surveyId, { answers });

    submit$.subscribe({
      next: () => {
        this.sending.set(false);
        this.completed.set(true);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(err?.error?.message || 'No fue posible guardar la respuesta.');
      },
    });
  }
}
