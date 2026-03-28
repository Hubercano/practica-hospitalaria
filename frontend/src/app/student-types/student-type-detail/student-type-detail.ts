import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentTypesService, StudentType } from '../student-types.service';
import { NotificationService } from '../../shared/notification/notification.service';

@Component({
  selector: 'app-student-type-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './student-type-detail.html',
  styleUrls: ['./student-type-detail.css']
})
export class StudentTypeDetail implements OnInit {
  typeId: string | null = null;
  form: FormGroup;
  reqForm: FormGroup;
  studentType: StudentType | null = null;
  isEditingType = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: StudentTypesService,
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
      if (id && id !== 'new') {
        this.typeId = id;
        this.loadData();
      } else {
        this.typeId = 'new';
      }
    });
  }

  loadData() {
    if (!this.typeId || this.typeId === 'new') return;
    this.service.getType(this.typeId).subscribe(data => {
      this.studentType = data;
      this.form.patchValue({
        name: data.name,
        description: data.description
      });
      if (!this.isEditingType) {
        this.form.disable({ emitEvent: false });
      }
    });
  }

  startEditingType() {
    if (!this.typeId || this.typeId === 'new') return;
    this.isEditingType = true;
    this.form.enable({ emitEvent: false });
  }

  cancelEditingType() {
    if (!this.typeId || this.typeId === 'new') return;
    this.isEditingType = false;
    this.loadData();
  }

  saveType() {
    if (this.form.invalid) return;

    if (this.typeId === 'new') {
      this.service.createType(this.form.value).subscribe(res => {
        this.router.navigate(['/student-types', res.id]);
      });
      return;
    }

    this.service.updateType(this.typeId!, this.form.getRawValue()).subscribe({
      next: (updated) => {
        this.studentType = {
          ...(this.studentType as StudentType),
          ...updated,
          requirements: this.studentType?.requirements ?? []
        };
        this.isEditingType = false;
        this.form.disable({ emitEvent: false });
        this.ns.success('Tipo de estudiante actualizado');
      },
      error: (err) => this.ns.error('Error al actualizar: ' + (err.error?.message || err.message))
    });
  }

  addRequirement() {
    if (this.reqForm.invalid || !this.typeId || this.typeId === 'new') {
      this.ns.error('Formulario inválido o tipo no guardado');
      return;
    }

    this.service.addRequirement(this.typeId, this.reqForm.value).subscribe({
      next: (newRequirement) => {
        const currentRequirements = this.studentType?.requirements ?? [];
        this.studentType = {
          ...(this.studentType as StudentType),
          requirements: [...currentRequirements, newRequirement]
        };
        this.reqForm.reset({ type: 'FILE', isRequired: true, requiresExpiryDate: false });
        this.ns.success('Requisito agregado');
      },
      error: (err) => this.ns.error('Error: ' + err.message)
    });
  }

  deleteRequirement(reqId: string) {
    if (!confirm('¿Eliminar este requisito documental? Los estudiantes perderán los documentos asociados a este requisito.')) return;
    this.service.deleteRequirement(reqId).subscribe({
      next: () => this.loadData(),
      error: (err) => this.ns.error('Error: ' + err.message)
    });
  }
}
