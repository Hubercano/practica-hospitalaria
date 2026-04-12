import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentsService, Student } from '../students.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { DocumentHistoryModalComponent } from '../../shared/components/document-history-modal/document-history-modal.component';
import { DocumentReviewActionsComponent } from '../../shared/components/document-review-actions/document-review-actions.component';
import { dateOnlyToUtcDate, toDateOnly } from '../../shared/utils/date.util';
import { getEstadoCarnet, getEstadoCarnetBadgeClass } from '../../shared/utils/student-induction.util';
import { AuthService } from '../../auth/auth.service';
import {
  DocumentsService,
  type DocumentHistoryResponse,
  type DocumentVersionSummary,
} from '../../shared/services/documents.service';

interface StudentRequirementValue {
  id: string;
  definitionId: string;
  definition: {
    name: string;
    description: string;
    type: 'FILE' | 'TEXT' | 'DATE';
    isRequired: boolean;
    requiresExpiryDate?: boolean;
  };
  value: string;
  displayValue?: string;
  expiryDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
  documentSlotId?: string | null;
  currentDocument?: DocumentVersionSummary | null;
}

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    ModalComponent,
    DocumentHistoryModalComponent,
    DocumentReviewActionsComponent,
  ],
  templateUrl: './student-detail.html',
  styleUrls: ['./student-detail.css']
})
export class StudentDetail implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  student: Student | null = null;
  studentId: string | null = null;
  reqForms = new Map<string, FormGroup>();
  editingReqs = new Set<string>();
  selectedFiles = new Map<string, File>();
  readonly getEstadoCarnetBadgeClass = getEstadoCarnetBadgeClass;
  readonly currentUser = this.authService.currentUser;

  historyModalOpen = false;
  historyLoading = false;
  historyRequirementName = '';
  historyData: DocumentHistoryResponse | null = null;

  rejectModalOpen = false;
  rejectingRequirement: StudentRequirementValue | null = null;
  reviewBusyReqId: string | null = null;
  readonly rejectForm = this.fb.group({
    rejectionReason: ['', Validators.required],
  });

  constructor(
    private route: ActivatedRoute,
    private service: StudentsService,
    private documentsService: DocumentsService,
    private cdr: ChangeDetectorRef,
    private ns: NotificationService
  ) {}

  ngOnInit() {
    this.studentId = this.route.snapshot.paramMap.get('id');
    if (this.studentId) {
      this.loadData();
    }
  }

  loadData() {
    if (!this.studentId) return;
    this.service.getStudent(this.studentId).subscribe({
      next: (data) => {
        this.student = data;

        this.student?.requirements?.forEach((req: StudentRequirementValue) => {
          this.initReqForm(req);
        });

        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  getForm(reqId: string): FormGroup | undefined {
    return this.reqForms.get(reqId);
  }

  initReqForm(req: StudentRequirementValue) {
    const initialValue = req.definition.type === 'DATE' && req.currentDocument?.dateValue
      ? req.currentDocument.dateValue.split('T')[0]
      : req.displayValue || req.value || '';
    const valueValidators = req.definition.type === 'FILE'
      ? []
      : (req.definition.isRequired ? Validators.required : []);

    const form = this.fb.group({
      value: [initialValue, valueValidators],
      expiryDate: [
        req.expiryDate ? req.expiryDate.split('T')[0] : '', 
        req.definition.requiresExpiryDate ? Validators.required : []
      ]
    });
    this.reqForms.set(req.id, form);
  }

  onFileSelected(event: Event, reqId: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFiles.set(reqId, file);
      const form = this.reqForms.get(reqId);
      if (form) {
        form.patchValue({ value: file.name });
        form.markAsDirty();
      }
    }
  }

  saveRequirement(req: StudentRequirementValue) {
    const form = this.reqForms.get(req.id);
    if (!form) {
      this.ns.error('No fue posible preparar el formulario del requisito');
      return;
    }

    if (!req.documentSlotId) {
      this.ns.error('No fue posible asociar este requisito al flujo documental. Recarga la página.');
      return;
    }

    if (req.definition.type === 'FILE') {
      if (!this.selectedFiles.has(req.id)) {
        this.ns.error('Debes seleccionar un archivo antes de guardar');
        return;
      }

      if (req.definition.requiresExpiryDate && !form.get('expiryDate')?.value) {
        form.get('expiryDate')?.markAsTouched();
        this.ns.error('Debes ingresar la fecha de vigencia para este documento');
        return;
      }
    } else if (form.invalid) {
      form.markAllAsTouched();
      this.ns.error('Completa los campos obligatorios antes de guardar');
      return;
    }

    const expiryDate = form.get('expiryDate')?.value || undefined;
    const request$ = req.definition.type === 'FILE'
      ? this.buildFileUploadRequest(req, expiryDate)
      : this.documentsService.submitValue(req.documentSlotId, form.get('value')?.value || '', expiryDate);

    if (!request$) {
      return;
    }

    request$.subscribe({
      next: () => {
        this.editingReqs.delete(req.id);
        this.selectedFiles.delete(req.id);
        this.ns.success('Documento enviado a revisión');
        this.loadData(); 
      },
      error: (err) => this.ns.error('Error al guardar: ' + err.message)
    });
  }

  canSaveRequirement(req: StudentRequirementValue) {
    const form = this.reqForms.get(req.id);
    if (!form) {
      return false;
    }

    if (req.definition.type === 'FILE') {
      if (!this.selectedFiles.has(req.id)) {
        return false;
      }

      if (req.definition.requiresExpiryDate && !form.get('expiryDate')?.value) {
        return false;
      }

      return true;
    }

    if (form.invalid) {
      return false;
    }

    return !form.pristine;
  }

  toggleEdit(reqId: string) {
    if (this.editingReqs.has(reqId)) {
      this.editingReqs.delete(reqId);
      this.selectedFiles.delete(reqId);
      const req = this.student?.requirements?.find((r: StudentRequirementValue) => r.id === reqId);
      if (req) this.initReqForm(req);
    } else {
      this.editingReqs.add(reqId);
    }
  }

  downloadFile(req: StudentRequirementValue) {
    const fileUrl = req.currentDocument?.fileUrl;
    if (!fileUrl) {
      this.ns.info('Este requisito no tiene archivo descargable');
      return;
    }

    window.open(`http://localhost:3000${fileUrl}`, '_blank', 'noopener');
  }

  openHistory(req: StudentRequirementValue) {
    if (!req.documentSlotId) {
      return;
    }

    this.historyModalOpen = true;
    this.historyLoading = true;
    this.historyRequirementName = req.definition.name;
    this.historyData = null;

    this.documentsService.getHistory(req.documentSlotId).subscribe({
      next: (data) => {
        this.historyData = data;
        this.historyLoading = false;
      },
      error: (err) => {
        this.historyLoading = false;
        this.ns.error('No fue posible cargar el historial: ' + err.message);
      }
    });
  }

  closeHistoryModal() {
    this.historyModalOpen = false;
    this.historyLoading = false;
    this.historyRequirementName = '';
    this.historyData = null;
  }

  approveRequirement(req: StudentRequirementValue) {
    if (!req.documentSlotId) {
      return;
    }

    this.reviewBusyReqId = req.id;
    this.documentsService.review(req.documentSlotId, 'APPROVED').subscribe({
      next: () => {
        this.reviewBusyReqId = null;
        this.ns.success('Documento aprobado');
        this.loadData();
      },
      error: (err) => {
        this.reviewBusyReqId = null;
        this.ns.error('No fue posible aprobar: ' + err.message);
      }
    });
  }

  openRejectModal(req: StudentRequirementValue) {
    this.rejectingRequirement = req;
    this.rejectForm.reset({ rejectionReason: req.currentDocument?.rejectionReason || '' });
    this.rejectModalOpen = true;
  }

  closeRejectModal() {
    this.rejectModalOpen = false;
    this.rejectingRequirement = null;
    this.rejectForm.reset({ rejectionReason: '' });
  }

  submitRejection() {
    if (!this.rejectingRequirement?.documentSlotId || this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    this.reviewBusyReqId = this.rejectingRequirement.id;
    this.documentsService.review(
      this.rejectingRequirement.documentSlotId,
      'REJECTED',
      this.rejectForm.get('rejectionReason')?.value || '',
    ).subscribe({
      next: () => {
        this.reviewBusyReqId = null;
        this.closeRejectModal();
        this.ns.success('Documento rechazado');
        this.loadData();
      },
      error: (err) => {
        this.reviewBusyReqId = null;
        this.ns.error('No fue posible rechazar: ' + err.message);
      }
    });
  }

  isHospitalUser() {
    return this.currentUser()?.role === 'HOSPITAL';
  }

  isInstitutionUser() {
    return this.currentUser()?.role === 'INSTITUCION';
  }

  canInstitutionEdit(req: StudentRequirementValue) {
    return this.isInstitutionUser() && req.status !== 'APPROVED';
  }

  getDocumentStatus(req: StudentRequirementValue): 'SIN_CARGAR' | 'PENDING' | 'APPROVED' | 'REJECTED' {
    if (!req.currentDocument) {
      return 'SIN_CARGAR';
    }

    return req.currentDocument.status;
  }

  getDocumentStatusLabel(req: StudentRequirementValue) {
    switch (this.getDocumentStatus(req)) {
      case 'APPROVED':
        return 'Aprobado';
      case 'REJECTED':
        return 'Rechazado';
      case 'PENDING':
        return 'En revisión';
      case 'SIN_CARGAR':
      default:
        return 'Sin cargar';
    }
  }

  getDocumentStatusClass(req: StudentRequirementValue) {
    switch (this.getDocumentStatus(req)) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      case 'SIN_CARGAR':
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getCarnetStatus(): 'Activo' | 'Devuelto' | 'Sin carnet' {
    return getEstadoCarnet(this.student?.numeroCarnet, this.student?.fechaDevolucionCarnet);
  }

  getChecklistStatus(req: any): 'PENDIENTE' | 'CRÍTICO' | 'PRÓXIMO A VENCER' | 'COMPLETADO' {
    const hasValue = !!req.value;

    if (req.definition?.isRequired && !hasValue) {
      return 'PENDIENTE';
    }

    if (req.definition?.requiresExpiryDate && hasValue && !req.expiryDate) {
      return 'PENDIENTE';
    }

    if (hasValue && req.expiryDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const expiry = dateOnlyToUtcDate(toDateOnly(req.expiryDate));
      expiry.setHours(0, 0, 0, 0);

      const criticalThreshold = new Date(now);
      criticalThreshold.setDate(now.getDate() + 5);

      const warningThreshold = new Date(now);
      warningThreshold.setDate(now.getDate() + 30);

      if (expiry <= criticalThreshold) {
        return 'CRÍTICO';
      }

      if (expiry <= warningThreshold) {
        return 'PRÓXIMO A VENCER';
      }
    }

    return 'COMPLETADO';
  }

  getChecklistStatusClass(checklistStatus: 'PENDIENTE' | 'CRÍTICO' | 'PRÓXIMO A VENCER' | 'COMPLETADO') {
    switch (checklistStatus) {
      case 'COMPLETADO':
        return 'bg-emerald-100 text-emerald-800';
      case 'CRÍTICO':
        return 'bg-rose-100 text-rose-800';
      case 'PRÓXIMO A VENCER':
        return 'bg-orange-100 text-orange-800';
      case 'PENDIENTE':
      default:
        return 'bg-amber-100 text-amber-800';
    }
  }

  private buildFileUploadRequest(req: StudentRequirementValue, expiryDate?: string) {
    const file = this.selectedFiles.get(req.id);
    if (!file || !req.documentSlotId) {
      this.ns.error('Debes seleccionar un archivo antes de guardar');
      return null;
    }

    return this.documentsService.uploadFile(req.documentSlotId, file, expiryDate);
  }
}

