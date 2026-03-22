import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicalServicesService } from '../../../core/services/clinical-services.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { AcademicProgramsService } from '../../../core/services/academic-programs.service';
import { RotationAreasService } from '../../../core/services/rotation-areas.service';
import { AcademicProgram } from '../../../core/models/academic-program.model';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-program-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ButtonComponent, NgSelectModule, FormsModule],
  templateUrl: './program-detail.component.html'})
export class ProgramDetailComponent implements OnInit {
  program = signal<AcademicProgram | null>(null);
  showAddAreaModal = false;
  newAreaForm: FormGroup;
  isSubmitting = false;
  services = signal<any[]>([]);
  selectedServicesList = signal<any[]>([]);

  constructor(
    private route: ActivatedRoute,
    private service: AcademicProgramsService,
    private rotationAreaService: RotationAreasService,
    private fb: FormBuilder,
    private clinicalService: ClinicalServicesService
  ) {
    this.newAreaForm = this.fb.group({
      name: ['', Validators.required],
      durationWeeks: ['', [Validators.required, Validators.min(1)]],
      maxStudents: ['', [Validators.required, Validators.min(1)]],
      serviceIds: [[]]
    });
  }

  ngOnInit() {
    this.loadProgram();
    this.loadServices();

    this.newAreaForm.get('serviceIds')?.valueChanges.subscribe(() => {
      this._updateSelectedList();
    });
  }

  loadServices() {
    this.clinicalService.getAll().subscribe(data => {
      this.services.set(data);
      this._updateSelectedList();
    });
  }

  private _updateSelectedList() {
    const selectedIds = this.newAreaForm.get('serviceIds')?.value || [];
    const fullList = this.services();
    const filtered = fullList.filter(s => selectedIds.includes(s.id));
    this.selectedServicesList.set(filtered);
  }

  removeService(serviceId: string) {
    const currentIds = this.newAreaForm.get('serviceIds')?.value || [];
    const newIds = currentIds.filter((id: string) => id !== serviceId);
    this.newAreaForm.patchValue({ serviceIds: newIds });
  }

  loadProgram() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.service.getOne(id).subscribe({
        next: (prog) => this.program.set(prog),
        error: (err) => console.error(err)
      });
    }
  }

  openAddAreaModal() {
    this.newAreaForm.reset();
    this.showAddAreaModal = true;
  }

  saveNewArea() {
    if (this.newAreaForm.valid && this.program()) {
      this.isSubmitting = true;
      const payload: any = {
        ...this.newAreaForm.value,
        programId: this.program()!.id,
        serviceIds: this.newAreaForm.value.serviceIds || []
      };
      
      // Ensure we convert number strings to numbers
      payload.durationWeeks = Number(payload.durationWeeks);
      payload.maxStudents = Number(payload.maxStudents);

      this.rotationAreaService.create(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showAddAreaModal = false;
          this.loadProgram(); // Reload to see new area
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteArea(areaId: string) {
    if (confirm('¿Está seguro de eliminar esta área de rotación?')) {
      this.rotationAreaService.remove(areaId).subscribe({
        next: () => this.loadProgram(),
        error: (err) => console.error(err)
      });
    }
  }
}

