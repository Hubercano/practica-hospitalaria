import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentsService, Student } from '../students.service';
import { NotificationService } from '../../shared/notification/notification.service';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './student-detail.html',
  styleUrls: ['./student-detail.css']
})
export class StudentDetail implements OnInit {
  student: Student | null = null;
  studentId: string | null = null;

  // Map to store a form for each requirement based on its requirementValue ID
  reqForms = new Map<string, FormGroup>();
  editingReqs = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private service: StudentsService,
    private fb: FormBuilder,
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
        
        // Initialize forms for each requirement
        this.student.requirements?.forEach((req: any) => {
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

  initReqForm(req: any) {
    const form = this.fb.group({
      value: [req.value || '', req.definition.isRequired ? Validators.required : []],
      expiryDate: [
        req.expiryDate ? req.expiryDate.split('T')[0] : '', 
        req.definition.requiresExpiryDate ? Validators.required : []
      ]
    });
    this.reqForms.set(req.id, form);
  }

  onFileSelected(event: any, reqId: string) {
    const file = event.target.files[0];
    if (file) {
      const form = this.reqForms.get(reqId);
      if (form) {
        // En un entorno productivo subirias esto a AWS S3. Por ahora simulamos guardando el nombre
        form.patchValue({ value: file.name });
        form.markAsDirty();
      }
    }
  }

  saveRequirement(req: any) {
    const form = this.reqForms.get(req.id);
    if (!form || form.invalid) return;

    const value = form.get('value')?.value;
    const expiryDate = form.get('expiryDate')?.value;

    this.service.submitRequirement(req.id, value, expiryDate).subscribe({
      next: () => {
        this.editingReqs.delete(req.id);
        this.loadData(); 
      },
      error: (err) => this.ns.error('Error al guardar: ' + err.message)
    });
  }

  deleteRequirementValue(req: any) {
    if(!confirm('¿Estás seguro de eliminar este documento subido?')) return;

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
      const req = this.student?.requirements?.find((r: any) => r.id === reqId);
      if (req) this.initReqForm(req);
    } else {
      this.editingReqs.add(reqId);
    }
  }
}

