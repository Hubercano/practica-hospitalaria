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
      this.form.controls['name'].disable();
    });
  }

  saveType() {
    if (this.form.invalid) return;

    this.service.createType(this.form.value).subscribe(res => {
      this.router.navigate(['/student-types', res.id]);
    });
  }

  addRequirement() {
    if (this.reqForm.invalid || !this.typeId || this.typeId === 'new') {
      this.ns.error('Formulario inválido o tipo no guardado');
      return;
    }

    this.service.addRequirement(this.typeId, this.reqForm.value).subscribe({
      next: () => {
        this.reqForm.reset({ type: 'FILE', isRequired: true, requiresExpiryDate: false });
        this.loadData();
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
