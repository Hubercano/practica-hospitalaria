import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { ClinicalServicesService } from '../../../core/services/clinical-services.service';
import { ServiceCapacityService } from '../../../core/services/service-capacity.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ClinicalService } from '../../../core/models/clinical-service.model';

@Component({
  selector: 'app-service-capacity-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule, 
    ButtonComponent, 
    CardComponent,
    FormFieldComponent,
    InputComponent,
    NgSelectModule, 
    FormsModule
  ],
  templateUrl: './service-capacity-form.component.html',
  styleUrls: ['./service-capacity-form.component.css']})
export class ServiceCapacityFormComponent implements OnInit {
  form: FormGroup;
  services = signal<ClinicalService[]>([]);
  isSubmitting = false;
  editingId: string | null = null;
  selectedServicesList = signal<ClinicalService[]>([]);

  constructor(
    private fb: FormBuilder,
    private capacityService: ServiceCapacityService,
    private clinicalService: ClinicalServicesService,
    private router: Router,
    private route: ActivatedRoute,
    private ns: NotificationService
  ) {
    this.form = this.fb.group({
      headquarters: ['', Validators.required],
      headquartersName: ['', Validators.required],
      capacityGroup: [''],
      concept: [''],
      capacityQuantity: [null, [Validators.required, Validators.min(1)]],
      serviceIds: [[], [Validators.required]]
    });
  }

  get controlErrors() {
    return {
      headquarters: this.form.get('headquarters')?.invalid && this.form.get('headquarters')?.touched ? 'La sede es requerida' : null,
      headquartersName: this.form.get('headquartersName')?.invalid && this.form.get('headquartersName')?.touched ? 'El nombre es requerido' : null,
      capacityQuantity: this.form.get('capacityQuantity')?.invalid && this.form.get('capacityQuantity')?.touched ? 'La cantidad debe ser mayor a 0' : null,
      serviceIds: this.form.get('serviceIds')?.invalid && this.form.get('serviceIds')?.touched ? 'Debe seleccionar al menos un servicio' : null,
    };
  }

  ngOnInit() {
    this.loadServices();

    this.form.get('serviceIds')?.valueChanges.subscribe(() => {
      this._updateSelectedList();
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editingId = id;
        this.loadCapacity(id);
      }
    });
  }

  loadCapacity(id: string) {
    this.capacityService.getOne(id).subscribe({
      next: (data) => {
        if (!data) return;

        const serviceIds = data.services ? data.services.map((s: any) => s.id) : [];

        this.form.patchValue({
          headquarters: data.headquarters,
          headquartersName: data.headquartersName,
          capacityGroup: data.capacityGroup,
          concept: data.concept,
          capacityQuantity: data.capacityQuantity,
          serviceIds: serviceIds
        });

        this._updateSelectedList();
      },
      error: (err) => {
        this.ns.error('Error al cargar los datos para editar.');
      }
    });
  }

  loadServices() {
    this.clinicalService.getAll().subscribe(data => {
      this.services.set(data);
      this._updateSelectedList();
    });
  }

  private _updateSelectedList() {
    const selectedIds = this.form.get('serviceIds')?.value || [];
    const fullList = this.services();
    const filtered = fullList.filter(s => selectedIds.includes(s.id));
    this.selectedServicesList.set(filtered);
  }

  removeService(serviceId: string) {
    const currentIds = this.form.get('serviceIds')?.value || [];
    const newIds = currentIds.filter((id: string) => id !== serviceId);
    this.form.patchValue({ serviceIds: newIds });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isSubmitting = true;
      const payload = this.form.value;

      const request$ = this.editingId
        ? this.capacityService.update(this.editingId, payload)
        : this.capacityService.create(payload);

      request$.subscribe({
        next: () => {
          this.router.navigate(['/service-capacity']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.ns.error('Error al guardar');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}

