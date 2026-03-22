import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicalServicesService } from '../../../core/services/clinical-services.service';
import { ServiceCapacityService } from '../../../core/services/service-capacity.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ClinicalService } from '../../../core/models/clinical-service.model';

@Component({
  selector: 'app-capacity-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './capacity-config.component.html'})
export class CapacityConfigComponent implements OnInit {
  capacityForm: FormGroup;
  services = signal<ClinicalService[]>([]);
  selectedService = signal<ClinicalService | undefined>(undefined);

  constructor(
    private fb: FormBuilder,
    private clinicalService: ClinicalServicesService,
    private capacityService: ServiceCapacityService,
    private ns: NotificationService
  ) {
    this.capacityForm = this.fb.group({
      serviceId: ['', Validators.required],
      distinctiveCode: ['', Validators.required],
      capacity: [1, [Validators.required, Validators.min(1)]],
      capacityGroup: ['']
    });

    // React to service selection
    this.capacityForm.get('serviceId')?.valueChanges.subscribe(id => {
      const service = this.services().find(s => s.id === id);
      this.selectedService.set(service);
    });
  }

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.clinicalService.getAll().subscribe(data => {
      this.services.set(data);
    });
  }

  onSubmit() {
    if (this.capacityForm.valid) {
      this.capacityService.create(this.capacityForm.value).subscribe({
        next: () => {
          this.ns.success('Capacidad registrada correctamente');
          this.capacityForm.reset();
        },
        error: (err) => console.error(err)
      });
    }
  }
}
