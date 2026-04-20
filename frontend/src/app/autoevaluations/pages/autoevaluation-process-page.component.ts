import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '../../auth/auth.service';
import { InstitutionService } from '../../institutions/services/institution.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import {
  AutoevaluationAction,
  AutoevaluationActionStatus,
  AutoevaluationCatalogResponse,
  AutoevaluationEvidenceFile,
  AutoevaluationFactorCatalog,
  AutoevaluationProcess,
  AutoevaluationProcessStatus,
  AutoevaluationsService,
  AuditLogEntry,
  SaveAutoevaluationActionPayload,
  SaveAutoevaluationDraftPayload,
  SaveAutoevaluationScorePayload,
} from '../services/autoevaluations.service';

type EditableScore = {
  id?: string;
  criterionId: string;
  factorName: string;
  criterionName: string;
  criterionMechanism: string;
  criterionWeight: number;
  score: number;
  complianceSelection: 'CUMPLE' | 'NO_CUMPLE' | null;
  evidence: string;
  improvementNotes: string;
};

type EditableAction = {
  id?: string;
  title: string;
  description: string;
  responsible: string;
  targetDate: string;
  progress: number;
  status: AutoevaluationActionStatus;
};

@Component({
  selector: 'app-autoevaluation-process-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, RouterModule, ButtonComponent],
  templateUrl: './autoevaluation-process-page.component.html',
})
export class AutoevaluationProcessPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly autoevaluationsService = inject(AutoevaluationsService);
  private readonly institutionService = inject(InstitutionService);

  readonly currentUser = this.authService.currentUser;
  readonly isHospital = computed(() => this.currentUser()?.role === 'HOSPITAL');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly opening = signal(false);
  readonly reviewing = signal(false);
  readonly uploadingEvidence = signal(false);
  readonly loadingAuditLog = signal(false);
  readonly error = signal<string | null>(null);

  readonly mode = signal<'create' | 'edit' | 'detail'>('create');
  readonly catalog = signal<AutoevaluationCatalogResponse | null>(null);
  readonly selectedProcess = signal<AutoevaluationProcess | null>(null);

  readonly institutions = signal<Array<{ id: string; name: string }>>([]);

  readonly openInstitutionId = signal<string | null>(null);
  readonly openYear = signal(new Date().getFullYear());
  readonly openPeriod = signal(1);

  readonly strengths = signal('');
  readonly opportunities = signal('');
  readonly conclusions = signal('');
  readonly editableScores = signal<EditableScore[]>([]);
  readonly editableActions = signal<EditableAction[]>([]);
  readonly reviewNotes = signal('');

  readonly evidencesByScore = signal<Map<string, AutoevaluationEvidenceFile[]>>(new Map());
  readonly auditLog = signal<AuditLogEntry[]>([]);
  readonly showAuditLog = signal(false);
  readonly selectedEvidenceFiles = signal<Record<string, File | null>>({});
  readonly evidenceDescriptions = signal<Record<string, string>>({});
  readonly supportPanels = signal<Record<string, boolean>>({});

  readonly metCriteriaCount = computed(
    () => this.editableScores().filter((item) => item.complianceSelection === 'CUMPLE').length,
  );

  readonly notMetCriteriaCount = computed(
    () => this.editableScores().filter((item) => item.complianceSelection === 'NO_CUMPLE').length,
  );

  readonly pendingCriteriaCount = computed(
    () => this.editableScores().filter((item) => item.complianceSelection === null).length,
  );

  readonly compliance = computed(() => {
    const total = this.editableScores().length;
    if (!total) {
      return 0;
    }

    return Number(((this.metCriteriaCount() / total) * 100).toFixed(2));
  });

  readonly nonCompliantCriteriaNames = computed(() =>
    this.editableScores()
      .filter((item) => item.complianceSelection === 'NO_CUMPLE')
      .map((item) => item.criterionName),
  );

  readonly groupedScores = computed(() => {
    const groups = new Map<string, EditableScore[]>();

    for (const item of this.editableScores()) {
      const bucket = groups.get(item.factorName) ?? [];
      bucket.push(item);
      groups.set(item.factorName, bucket);
    }

    return Array.from(groups.entries()).map(([factorName, items]) => ({
      factorName,
      items: items.map((entry) => ({
        ...entry,
        flatIndex: this.editableScores().findIndex((x) => x.criterionId === entry.criterionId),
      })),
    }));
  });

  readonly isReadOnly = computed(() => this.mode() === 'detail');

  readonly canEditDraft = computed(() => {
    const process = this.selectedProcess();
    if (!process || this.isReadOnly()) {
      return false;
    }

    return process.status !== 'APPROVED' && process.status !== 'CLOSED';
  });

  readonly canSubmit = computed(() => {
    const process = this.selectedProcess();
    if (!process) {
      return false;
    }

    return this.canEditDraft() && this.editableScores().length > 0 && this.pendingCriteriaCount() === 0;
  });

  readonly periodOptions = [1, 2, 3, 4];
  readonly reviewStatusOptions: Array<{ label: string; value: Extract<AutoevaluationProcessStatus, 'IN_REVIEW' | 'APPROVED' | 'CLOSED'> }> = [
    { label: 'En revision', value: 'IN_REVIEW' },
    { label: 'Aprobado', value: 'APPROVED' },
    { label: 'Cerrado', value: 'CLOSED' },
  ];

  readonly pageTitle = computed(() => {
    if (this.mode() === 'create') {
      return 'Abrir proceso de Autoevaluacion';
    }

    if (this.mode() === 'detail') {
      return 'Detalle de proceso de Autoevaluacion';
    }

    return 'Editar proceso de Autoevaluacion';
  });

  constructor() {
    const currentMode = (this.route.snapshot.data['mode'] as 'create' | 'edit' | 'detail' | undefined) ?? 'create';
    this.mode.set(currentMode);
    this.loadInitialData();
  }

  goBack() {
    this.router.navigate(['/autoevaluations']);
  }

  loadInitialData() {
    this.loading.set(true);
    this.error.set(null);

    this.loadInstitutionsIfNeeded();
    this.autoevaluationsService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.seedScoresFromCatalog(catalog.factors);

        const processId = this.route.snapshot.paramMap.get('id');
        if (processId) {
          this.loadProcessById(processId);
          return;
        }

        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No fue posible cargar el catalogo de autoevaluacion.');
        this.loading.set(false);
      },
    });
  }

  loadProcessById(processId: string) {
    this.autoevaluationsService.getProcessById(processId).subscribe({
      next: (process) => {
        this.selectedProcess.set(process);
        this.hydrateEditorFromProcess(process);
        this.loadEvidencesForProcess(process);
        this.loadAuditLogForProcess(process);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No fue posible cargar el detalle del proceso.');
        this.loading.set(false);
      },
    });
  }

  loadEvidencesForProcess(process: AutoevaluationProcess) {
    if (!process.scores.length) {
      this.evidencesByScore.set(new Map());
      return;
    }

    const evidencesMap = new Map<string, AutoevaluationEvidenceFile[]>();
    let completed = 0;

    process.scores.forEach((score) => {
      this.autoevaluationsService.getScoreEvidences(score.id).subscribe({
        next: (evidences) => {
          evidencesMap.set(score.id, evidences);
          completed++;
          if (completed === process.scores.length) {
            this.evidencesByScore.set(evidencesMap);
          }
        },
        error: () => {
          evidencesMap.set(score.id, []);
          completed++;
          if (completed === process.scores.length) {
            this.evidencesByScore.set(evidencesMap);
          }
        },
      });
    });
  }

  loadAuditLogForProcess(process: AutoevaluationProcess) {
    this.loadingAuditLog.set(true);
    this.autoevaluationsService.getProcessAuditLog(process.id).subscribe({
      next: (log) => {
        this.auditLog.set(log);
        this.loadingAuditLog.set(false);
      },
      error: () => {
        this.auditLog.set([]);
        this.loadingAuditLog.set(false);
      },
    });
  }

  onEvidenceFileSelected(event: Event, criterionId: string) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.selectedEvidenceFiles.update((current) => ({
        ...current,
        [criterionId]: file,
      }));
    }
  }

  uploadEvidence(scoreId: string | undefined, criterionId: string) {
    const file = this.selectedEvidenceFiles()[criterionId] || null;
    const description = this.evidenceDescriptions()[criterionId] || '';

    if (!file || !scoreId) {
      if (!file) {
        this.notifications.error('Seleccione un archivo y un criterio.');
        return;
      }

      this.uploadingEvidence.set(true);
      this.ensureScoreIdForCriterion(criterionId, (resolvedScoreId) => {
        this.performEvidenceUpload(resolvedScoreId, criterionId, file, description);
      });
      return;
    }

    this.uploadingEvidence.set(true);
    this.performEvidenceUpload(scoreId, criterionId, file, description);
  }

  private ensureScoreIdForCriterion(criterionId: string, onReady: (scoreId: string) => void) {
    const process = this.selectedProcess();
    if (!process || !this.canEditDraft()) {
      this.uploadingEvidence.set(false);
      this.notifications.error('No se pudo preparar el criterio para cargar la evidencia.');
      return;
    }

    const payload: SaveAutoevaluationDraftPayload = {
      strengths: this.strengths(),
      opportunities: this.opportunities(),
      conclusions: this.conclusions(),
      scores: this.buildScorePayload(),
      actions: this.buildActionsPayload(),
    };

    this.autoevaluationsService.saveDraft(process.id, payload).subscribe({
      next: (updated) => {
        this.selectedProcess.set(updated);
        this.hydrateEditorFromProcess(updated);

        const score = updated.scores.find((item) => item.criterionId === criterionId);
        if (!score?.id) {
          this.uploadingEvidence.set(false);
          this.notifications.error('No fue posible obtener el identificador del criterio para cargar evidencia.');
          return;
        }

        onReady(score.id);
      },
      error: (err) => {
        this.uploadingEvidence.set(false);
        this.notifications.error(err?.error?.message || 'No fue posible preparar el criterio para cargar evidencia.');
      },
    });
  }

  private performEvidenceUpload(scoreId: string, criterionId: string, file: File, description: string) {
    this.autoevaluationsService.uploadEvidence(scoreId, file, description).subscribe({
      next: () => {
        this.uploadingEvidence.set(false);
        this.selectedEvidenceFiles.update((current) => ({
          ...current,
          [criterionId]: null,
        }));
        this.evidenceDescriptions.update((current) => ({
          ...current,
          [criterionId]: '',
        }));
        this.notifications.success('Evidencia cargada correctamente.');
        const process = this.selectedProcess();
        if (process) {
          this.loadEvidencesForProcess(process);
        }

        const input = document.getElementById(`evidence-file-${criterionId}`) as HTMLInputElement | null;
        if (input) {
          input.value = '';
        }
      },
      error: (err) => {
        this.uploadingEvidence.set(false);
        this.notifications.error(err?.error?.message || 'No fue posible cargar la evidencia.');
      },
    });
  }

  downloadEvidence(evidence: AutoevaluationEvidenceFile) {
    const anchor = document.createElement('a');
    anchor.href = `http://localhost:3000${evidence.fileUrl}`;
    anchor.download = evidence.originalFileName;
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  deleteEvidenceFile(evidence: AutoevaluationEvidenceFile) {
    if (!confirm('¿Esta seguro de que desea eliminar esta evidencia?')) {
      return;
    }

    this.autoevaluationsService.deleteEvidence(evidence.id).subscribe({
      next: () => {
        this.notifications.success('Evidencia eliminada correctamente.');
        const process = this.selectedProcess();
        if (process) {
          this.loadEvidencesForProcess(process);
        }
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'No fue posible eliminar la evidencia.');
      },
    });
  }

  toggleAuditLog() {
    this.showAuditLog.update((v) => !v);
  }

  getScoreEvidences(scoreId: string): AutoevaluationEvidenceFile[] {
    return this.evidencesByScore().get(scoreId) || [];
  }

  isSupportPanelOpen(scoreId: string): boolean {
    return this.supportPanels()[scoreId] === true;
  }

  toggleSupportPanel(scoreId: string) {
    this.supportPanels.update((current) => ({
      ...current,
      [scoreId]: !current[scoreId],
    }));
  }

  getEvidenceDescription(criterionId: string): string {
    return this.evidenceDescriptions()[criterionId] || '';
  }

  setEvidenceDescription(criterionId: string, value: string) {
    this.evidenceDescriptions.update((current) => ({
      ...current,
      [criterionId]: value,
    }));
  }

  hasSelectedEvidenceFile(criterionId: string): boolean {
    return !!this.selectedEvidenceFiles()[criterionId];
  }

  getSelectedEvidenceFileName(criterionId: string): string | null {
    return this.selectedEvidenceFiles()[criterionId]?.name || null;
  }

  openProcess() {
    const institutionId = this.resolveInstitutionForOpen();
    if (!institutionId) {
      this.notifications.error('Debe seleccionar una institucion para abrir el proceso.');
      return;
    }

    this.opening.set(true);
    this.autoevaluationsService
      .openProcess({
        institutionId,
        year: this.openYear(),
        period: this.openPeriod(),
      })
      .subscribe({
        next: (process) => {
          this.opening.set(false);
          this.notifications.success('Proceso de autoevaluacion abierto correctamente.');
          this.router.navigate(['/autoevaluations', process.id, 'edit']);
        },
        error: (err) => {
          this.opening.set(false);
          this.notifications.error(err?.error?.message || 'No fue posible abrir el proceso.');
        },
      });
  }

  saveDraft() {
    const process = this.selectedProcess();
    if (!process || !this.canEditDraft()) {
      return;
    }

    this.saving.set(true);
    const payload: SaveAutoevaluationDraftPayload = {
      strengths: this.strengths(),
      opportunities: this.opportunities(),
      conclusions: this.conclusions(),
      scores: this.buildScorePayload(),
      actions: this.buildActionsPayload(),
    };

    this.autoevaluationsService.saveDraft(process.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.selectedProcess.set(updated);
        this.hydrateEditorFromProcess(updated);
        this.notifications.success('Borrador guardado correctamente.');
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message || 'No fue posible guardar el borrador.');
      },
    });
  }

  submitProcess() {
    const process = this.selectedProcess();
    if (!process || !this.canSubmit()) {
      return;
    }

    this.saving.set(true);
    this.autoevaluationsService.submitProcess(process.id).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.selectedProcess.set(updated);
        this.hydrateEditorFromProcess(updated);
        this.notifications.success('Proceso enviado para revision.');
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message || 'No fue posible enviar el proceso.');
      },
    });
  }

  reviewProcess(status: Extract<AutoevaluationProcessStatus, 'IN_REVIEW' | 'APPROVED' | 'CLOSED'>) {
    const process = this.selectedProcess();
    if (!process || !this.isHospital() || this.isReadOnly()) {
      return;
    }

    this.reviewing.set(true);
    this.autoevaluationsService
      .reviewProcess(process.id, {
        status,
        reviewNotes: this.reviewNotes(),
      })
      .subscribe({
        next: (updated) => {
          this.reviewing.set(false);
          this.selectedProcess.set(updated);
          this.hydrateEditorFromProcess(updated);
          this.notifications.success('Revision registrada correctamente.');
        },
        error: (err) => {
          this.reviewing.set(false);
          this.notifications.error(err?.error?.message || 'No fue posible registrar la revision.');
        },
      });
  }

  addAction() {
    this.editableActions.update((items) => [
      ...items,
      {
        title: '',
        description: '',
        responsible: '',
        targetDate: '',
        progress: 0,
        status: 'PLANNED',
      },
    ]);
  }

  removeAction(index: number) {
    this.editableActions.update((items) => items.filter((_, idx) => idx !== index));
  }

  updateComplianceSelection(index: number, value: 'CUMPLE' | 'NO_CUMPLE' | '') {
    this.editableScores.update((items) =>
      items.map((item, idx) => {
        if (idx !== index) {
          return item;
        }

        if (!value) {
          return {
            ...item,
            complianceSelection: null,
            score: 0,
          };
        }

        return {
          ...item,
          complianceSelection: value,
          score: value === 'CUMPLE' ? 5 : 0,
        };
      }),
    );
  }

  updateEvidence(index: number, value: string) {
    this.editableScores.update((items) =>
      items.map((item, idx) => (idx === index ? { ...item, evidence: value || '' } : item)),
    );
  }

  trackByAction(index: number, item: EditableAction) {
    return item.id || `${item.title}-${index}`;
  }

  private seedScoresFromCatalog(factors: AutoevaluationFactorCatalog[]) {
    const baseScores: EditableScore[] = [];

    for (const factor of factors) {
      for (const criterion of factor.criteria) {
        baseScores.push({
          criterionId: criterion.id,
          factorName: factor.name,
          criterionName: criterion.name,
          criterionMechanism: criterion.verificationMechanism || criterion.description || '',
          criterionWeight: criterion.weight,
          score: 0,
          complianceSelection: null,
          evidence: '',
          improvementNotes: '',
        });
      }
    }

    this.editableScores.set(baseScores);
  }

  private loadInstitutionsIfNeeded() {
    if (!this.isHospital()) {
      const institutionId = this.currentUser()?.institutionId || null;
      this.openInstitutionId.set(institutionId);
      return;
    }

    this.institutionService.getInstitutions(true).subscribe({
      next: (institutions) => {
        this.institutions.set(institutions.map((item) => ({ id: item.id, name: item.name })));
      },
      error: () => {
        this.notifications.error('No fue posible cargar las instituciones.');
      },
    });
  }

  private hydrateEditorFromProcess(process: AutoevaluationProcess) {
    this.strengths.set(process.strengths || '');
    this.opportunities.set(process.opportunities || '');
    this.conclusions.set(process.conclusions || '');
    this.reviewNotes.set(process.conclusions || '');

    const scoreMap = new Map(process.scores.map((item) => [item.criterionId, item]));
    const current = this.catalog();

    if (!current) {
      return;
    }

    const nextScores: EditableScore[] = [];
    for (const factor of current.factors) {
      for (const criterion of factor.criteria) {
        const existing = scoreMap.get(criterion.id);
        nextScores.push({
          id: existing?.id,
          criterionId: criterion.id,
          factorName: factor.name,
          criterionName: criterion.name,
          criterionMechanism: criterion.verificationMechanism || criterion.description || '',
          criterionWeight: criterion.weight,
          score: existing?.score || 0,
          complianceSelection:
            existing === undefined
              ? null
              : (existing.score ?? 0) >= 3
                ? 'CUMPLE'
                : 'NO_CUMPLE',
          evidence: existing?.evidence || '',
          improvementNotes: existing?.improvementNotes || '',
        });
      }
    }
    this.editableScores.set(nextScores);

    this.editableActions.set(
      process.actions.map((item: AutoevaluationAction) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        responsible: item.responsible || '',
        targetDate: item.targetDate ? item.targetDate.slice(0, 10) : '',
        progress: item.progress,
        status: item.status,
      })),
    );
  }

  private resolveInstitutionForOpen() {
    if (!this.isHospital()) {
      return this.currentUser()?.institutionId || null;
    }

    return this.openInstitutionId();
  }

  private buildScorePayload(): SaveAutoevaluationScorePayload[] {
    return this.editableScores().map((item) => ({
      criterionId: item.criterionId,
      score: item.score,
      evidence: item.evidence?.trim() || undefined,
      improvementNotes: item.improvementNotes?.trim() || undefined,
    }));
  }

  private buildActionsPayload(): SaveAutoevaluationActionPayload[] {
    return this.editableActions()
      .filter((item) => item.title.trim())
      .map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        responsible: item.responsible?.trim() || undefined,
        targetDate: item.targetDate || undefined,
        progress: item.progress,
        status: item.status,
      }));
  }
}
