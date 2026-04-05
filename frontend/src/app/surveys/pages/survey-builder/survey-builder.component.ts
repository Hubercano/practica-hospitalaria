import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SurveysService, SurveyQuestionType } from '../../services/surveys.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-survey-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './survey-builder.component.html',
  styleUrl: './survey-builder.component.css',
})
export class SurveyBuilderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly surveysService = inject(SurveysService);
  private readonly ns = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  surveyId: string | null = null;
  isEditMode = false;
  isSaving = signal(false);
  loadedQuestionIds: string[] = [];

  readonly questionTypes: Array<{ value: SurveyQuestionType; label: string }> = [
    { value: 'SHORT_TEXT', label: 'Texto corto' },
    { value: 'LONG_TEXT', label: 'Texto largo' },
    { value: 'SINGLE_CHOICE', label: 'Selección única' },
    { value: 'MULTIPLE_CHOICE', label: 'Selección múltiple' },
    { value: 'SCALE', label: 'Escala' },
    { value: 'DROPDOWN', label: 'Desplegable' },
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    status: ['INACTIVE'],
    isOpenAccess: [false],
    questions: this.fb.array<FormGroup>([]),
  });

  get questionsArray(): FormArray<FormGroup> {
    return this.form.get('questions') as FormArray<FormGroup>;
  }

  ngOnInit() {
    this.surveyId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.surveyId;

    if (this.isEditMode && this.surveyId) {
      this.loadSurvey(this.surveyId);
    } else {
      this.addQuestion();
    }
  }

  addQuestion() {
    const question = this.fb.group({
      id: [''],
      title: ['', Validators.required],
      description: [''],
      type: ['SHORT_TEXT', Validators.required],
      isRequired: [false],
      orderIndex: [this.questionsArray.length],
      scaleMin: [1],
      scaleMax: [5],
      scaleStep: [1],
      optionsText: [''],
    });

    this.questionsArray.push(question);
  }

  removeQuestion(index: number) {
    this.questionsArray.removeAt(index);
    this.reindexQuestions();
  }

  moveQuestionUp(index: number) {
    if (index <= 0) return;
    const current = this.questionsArray.at(index);
    const previous = this.questionsArray.at(index - 1);
    this.questionsArray.setControl(index - 1, current);
    this.questionsArray.setControl(index, previous);
    this.reindexQuestions();
  }

  moveQuestionDown(index: number) {
    if (index >= this.questionsArray.length - 1) return;
    const current = this.questionsArray.at(index);
    const next = this.questionsArray.at(index + 1);
    this.questionsArray.setControl(index + 1, current);
    this.questionsArray.setControl(index, next);
    this.reindexQuestions();
  }

  saveSurvey() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.ns.error('Completa los campos obligatorios de la encuesta.');
      return;
    }

    const payload = {
      name: this.form.value.name as string,
      description: (this.form.value.description as string) || undefined,
      status: (this.form.value.status as 'ACTIVE' | 'INACTIVE') || 'INACTIVE',
      isOpenAccess: !!this.form.value.isOpenAccess,
    };

    this.isSaving.set(true);

    const request$ = this.isEditMode && this.surveyId
      ? this.surveysService.updateSurvey(this.surveyId, payload)
      : this.surveysService.createSurvey(payload);

    request$.subscribe({
      next: (survey) => {
        this.persistQuestions(survey.id);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.ns.error(err?.error?.message || 'No se pudo guardar la encuesta');
      },
    });
  }

  private persistQuestions(surveyId: string) {
    const questions = this.questionsArray.controls.map((group, index) => {
      const type = group.value.type as SurveyQuestionType;
      const optionsText = String(group.value.optionsText || '').trim();
      const options = this.parseOptions(optionsText);

      return {
        id: group.value.id as string,
        title: String(group.value.title || '').trim(),
        description: String(group.value.description || '').trim() || undefined,
        type,
        isRequired: !!group.value.isRequired,
        orderIndex: index,
        scaleMin: type === 'SCALE' ? Number(group.value.scaleMin || 1) : undefined,
        scaleMax: type === 'SCALE' ? Number(group.value.scaleMax || 5) : undefined,
        scaleStep: type === 'SCALE' ? Number(group.value.scaleStep || 1) : undefined,
        options,
      };
    });

    const currentQuestionIds = questions
      .map((question) => question.id)
      .filter((id): id is string => !!id);

    const deletedQuestionIds = this.loadedQuestionIds.filter((id) => !currentQuestionIds.includes(id));

    const createOrUpdateCalls = questions.map((question) => {
      const payload = {
        title: question.title,
        description: question.description,
        type: question.type,
        isRequired: question.isRequired,
        orderIndex: question.orderIndex,
        scaleMin: question.scaleMin,
        scaleMax: question.scaleMax,
        scaleStep: question.scaleStep,
        options: question.options,
      };

      if (question.id) {
        return this.surveysService.updateQuestion(surveyId, question.id, payload);
      }
      return this.surveysService.createQuestion(surveyId, payload as any);
    });

    const deleteCalls = deletedQuestionIds.map((questionId) => this.surveysService.deleteQuestion(surveyId, questionId));

    const requests = [...createOrUpdateCalls, ...deleteCalls];

    if (!requests.length) {
      this.finalizeSave(surveyId);
      return;
    }

    forkJoin(requests.length ? requests : [of(null)]).subscribe({
      next: () => {
        this.finalizeSave(surveyId);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.ns.error(err?.error?.message || 'No se pudo sincronizar la encuesta');
      },
    });
  }

  private finalizeSave(surveyId: string) {
    this.isSaving.set(false);
    this.ns.success('Encuesta guardada correctamente');
    this.router.navigate(['/surveys', surveyId, 'edit']);
  }

  private loadSurvey(id: string) {
    this.surveysService.getSurvey(id).subscribe({
      next: (survey) => {
        this.form.patchValue({
          name: survey.name,
          description: survey.description || '',
          status: survey.status,
          isOpenAccess: !!survey.isOpenAccess,
        });

        this.questionsArray.clear();
        const questions = survey.questions || [];
        this.loadedQuestionIds = questions.map((q: any) => q.id).filter(Boolean);
        if (!questions.length) {
          this.addQuestion();
          return;
        }

        questions.forEach((q: any, idx: number) => {
          const optionsText = (q.options || []).map((o: any) => o.label).join('\n');
          this.questionsArray.push(
            this.fb.group({
              id: [q.id],
              title: [q.title, Validators.required],
              description: [q.description || ''],
              type: [q.type, Validators.required],
              isRequired: [!!q.isRequired],
              orderIndex: [q.orderIndex ?? idx],
              scaleMin: [q.scaleMin ?? 1],
              scaleMax: [q.scaleMax ?? 5],
              scaleStep: [q.scaleStep ?? 1],
              optionsText: [optionsText],
            }),
          );
        });

        this.reindexQuestions();
      },
      error: (err) => this.ns.error(err?.error?.message || 'No se pudo cargar la encuesta'),
    });
  }

  private parseOptions(optionsText: string): Array<{ label: string; value: string; orderIndex: number }> | undefined {
    if (!optionsText) return undefined;
    const rows = optionsText
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    if (!rows.length) return undefined;

    return rows.map((label, index) => ({
      label,
      value: label,
      orderIndex: index,
    }));
  }

  private reindexQuestions() {
    this.questionsArray.controls.forEach((group, index) => {
      group.patchValue({ orderIndex: index }, { emitEvent: false });
    });
  }

  isChoiceType(type: SurveyQuestionType) {
    return type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE' || type === 'DROPDOWN';
  }

  publishSurvey() {
    if (!this.surveyId) {
      this.ns.error('Primero guarda la encuesta antes de publicarla.');
      return;
    }

    this.surveysService.publishSurvey(this.surveyId).subscribe({
      next: () => {
        this.ns.success('Encuesta publicada correctamente');
        this.loadSurvey(this.surveyId as string);
      },
      error: (err) => {
        this.ns.error(err?.error?.message || 'No se pudo publicar la encuesta');
      },
    });
  }

  get openAccessLink(): string {
    return this.surveyId ? this.surveysService.getOpenAccessLink(this.surveyId) : '';
  }

  async copyOpenAccessLink() {
    if (!this.openAccessLink) {
      this.ns.error('No hay link público disponible para copiar.');
      return;
    }

    const copied = await this.copyText(this.openAccessLink);
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
