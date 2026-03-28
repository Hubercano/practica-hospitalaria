
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InstitutionService } from '../../services/institution.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

interface RequirementValue {
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
  expiryDate?: string; // Added to interface
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
}

interface InstitutionDetail {
  id: string;
  name: string;
  nit: string;
  email: string;
  type: {
    name: string;
  };
  requirements: RequirementValue[];
}

@Component({
  selector: 'app-institution-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './institution-detail.component.html',
  styleUrls: ['./institution-detail.component.css']
})
export class InstitutionDetailComponent implements OnInit {
  institution: any = null; // Changed to any to be flexible with backend response
  institutionId: string | null = null;
  
  // Map to store a form for each requirement
  reqForms = new Map<string, FormGroup>();
  
  // Set to track which requirements are being edited (replacing file)
  editingReqs = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private service: InstitutionService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private ns: NotificationService
  ) {}

  ngOnInit() {
    this.institutionId = this.route.snapshot.paramMap.get('id');
    if (this.institutionId) {
      this.loadData();
    }
  }

  loadData() {
    if (!this.institutionId) return;
    this.service.getInstitution(this.institutionId).subscribe({
      next: (data) => {
        console.log('Detalle Institución:', data);
        this.institution = data;
        
        // Initialize forms for each requirement
        this.institution.requirements?.forEach((req: RequirementValue) => {
          this.initReqForm(req);
        });
        
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  goBack() {
    // Removed
  }

  // Helper to get form for template
  getForm(reqId: string): FormGroup | undefined {
    return this.reqForms.get(reqId);
  }

  initReqForm(req: RequirementValue) {
    const form = this.fb.group({
      value: [req.value || '', req.definition.isRequired ? Validators.required : []],
      expiryDate: [req.expiryDate || '', req.definition.requiresExpiryDate ? Validators.required : []]
    });
    this.reqForms.set(req.id, form);
  }

  onFileSelected(event: any, reqId: string) {
    const file = event.target.files[0];
    if (file) {
      const form = this.reqForms.get(reqId);
      if (form) {
        form.patchValue({ value: file.name });
        form.markAsDirty();
      }
    }
  }

  saveRequirement(req: RequirementValue) {
    const form = this.reqForms.get(req.id);
    if (!form || form.invalid) return;
    
    const value = form.get('value')?.value;
    const expiryDate = form.get('expiryDate')?.value;

    this.service.submitRequirement(req.id, value, expiryDate).subscribe({
      next: () => {
        // Stop editing mode if valid
        this.editingReqs.delete(req.id);
        this.loadData(); // Reload to get updated status/values
        // feedback: requisito guardado (handled via notifications)
      },
      error: (err) => this.ns.error('Error al guardar: ' + err.message)
    });
  }

  deleteRequirementValue(req: RequirementValue) {
    if(!confirm('¿Estás seguro de eliminar este documento?')) return;
    
    // Simulate delete by sending empty string
    this.service.submitRequirement(req.id, '', undefined).subscribe({
      next: () => {
        this.editingReqs.delete(req.id);
        this.loadData();
      },
      error: (err) => this.ns.error('Error al eliminar: ' + err.message)
    });
  }
  
  toggleEdit(reqId: string) {
    if (this.editingReqs.has(reqId)) {
      this.editingReqs.delete(reqId);
      // Reset form to original value if cancelling edit
      const req = this.institution.requirements.find((r: any) => r.id === reqId);
      if (req) this.initReqForm(req);
    } else {
      this.editingReqs.add(reqId);
    }
  }

  // Placeholder for download/view
  downloadFile(req: RequirementValue) {
    this.ns.info(`Descargando archivo: ${req.value}`);
  }

  getChecklistStatus(req: RequirementValue): 'PENDIENTE' | 'CRÍTICO' | 'PRÓXIMO A VENCER' | 'COMPLETADO' {
    const hasValue = !!req.value;

    // Requisito obligatorio sin documento/valor cargado
    if (req.definition?.isRequired && !hasValue) {
      return 'PENDIENTE';
    }

    // Si requiere vigencia y no tiene fecha, queda pendiente
    if (req.definition?.requiresExpiryDate && hasValue && !req.expiryDate) {
      return 'PENDIENTE';
    }

    if (hasValue && req.expiryDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const expiry = new Date(req.expiryDate);
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
}
