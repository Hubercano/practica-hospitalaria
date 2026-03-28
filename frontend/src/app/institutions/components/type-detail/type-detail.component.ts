import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InstitutionService } from '../../services/institution.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

interface InstitutionType {
  id: string;
  name: string;
  description: string;
  requirements: Requirement[];
}

interface Requirement {
  id: string;
  name: string;
  type: string;
  description: string;
  isRequired: boolean;
  requiresExpiryDate: boolean;
}

@Component({
  selector: 'app-type-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './type-detail.component.html',
  styleUrls: ['./type-detail.component.css']
})
export class TypeDetailComponent implements OnInit {
  typeId: string | null = null;
  form: FormGroup;
  reqForm: FormGroup;
  institutionType: InstitutionType | null = null;
  isEditingType = false;
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: InstitutionService,
    private ns: NotificationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });

    this.reqForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      type: ['FILE', Validators.required],
      isRequired: [true],
      requiresExpiryDate: [false]
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.typeId = id;
        this.loadData();
      } else {
        this.typeId = 'new';
      }
    });
  }

  loadData() {
    if (!this.typeId) return;
    this.service.getType(this.typeId).subscribe(data => {
      this.institutionType = data;
      this.form.patchValue({
        name: data.name,
        description: data.description
      });
      if (this.typeId !== 'new' && !this.isEditingType) {
        this.form.disable({ emitEvent: false });
      }
    });
  }

  startEditingType() {
    if (this.typeId === 'new') return;
    this.isEditingType = true;
    this.form.enable({ emitEvent: false });
  }

  cancelEditingType() {
    if (this.typeId === 'new') return;
    this.isEditingType = false;
    this.loadData();
  }

  saveType() {
    if (this.form.invalid) return;

    if (this.typeId === 'new') {
      this.service.createType(this.form.value).subscribe(res => {
        this.router.navigate(['/institutions/types', res.id]);
      });
      return;
    }

    this.service.updateType(this.typeId!, this.form.getRawValue()).subscribe({
      next: (updated) => {
        this.institutionType = {
          ...(this.institutionType as InstitutionType),
          ...updated,
          requirements: this.institutionType?.requirements ?? []
        };
        this.isEditingType = false;
        this.form.disable({ emitEvent: false });
        this.ns.success('Tipo de institución actualizado');
      },
      error: (err) => this.ns.error('Error al actualizar: ' + (err.error?.message || err.message))
    });
  }

  addRequirement() {
    if (this.reqForm.invalid || !this.typeId) {
      this.ns.error('Formulario inválido o tipo no guardado');
      return;
    }
    
    this.service.addRequirement(this.typeId, this.reqForm.value).subscribe({
      next: (newRequirement) => {
        const currentRequirements = this.institutionType?.requirements ?? [];
        this.institutionType = {
          ...(this.institutionType as InstitutionType),
          requirements: [...currentRequirements, newRequirement]
        };
        this.reqForm.reset({ type: 'FILE', isRequired: true, requiresExpiryDate: false });
        this.ns.success('Requisito agregado');
      },
      error: (err) => this.ns.error('Error: ' + err.message)
    });
  }

  deleteRequirement(reqId: string) {
    if (!confirm('¿Eliminar este requisito? Las instituciones perderán los documentos asociados.')) return;
    this.service.deleteRequirement(reqId).subscribe({
      next: () => this.loadData(),
      error: (err) => this.ns.error('Error: ' + err.message)
    });
  }


}
