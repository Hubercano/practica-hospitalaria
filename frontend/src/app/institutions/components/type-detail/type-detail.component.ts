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
      // In edit mode, disable main fields for now (or implement update endpoint later)
      this.form.controls['name'].disable();
    });
  }

  saveType() {
    if (this.form.invalid) return;
    
    this.service.createType(this.form.value).subscribe(res => {
      this.router.navigate(['/institutions/types', res.id]);
    });
  }

  addRequirement() {
    if (this.reqForm.invalid || !this.typeId) {
      this.ns.error('Formulario inválido o tipo no guardado');
      return;
    }
    
    this.service.addRequirement(this.typeId, this.reqForm.value).subscribe({
      next: () => {
        this.reqForm.reset({ type: 'FILE', isRequired: true, requiresExpiryDate: false });
        // Refresh the list immediately to show the new requirement and updated status
        this.loadData();
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
