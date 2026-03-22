// src/app/core/models/service-capacity.model.ts
import { ClinicalService } from './clinical-service.model';

export interface ServiceCapacity {
  id: string;
  headquarters: string;
  headquartersName: string;
  capacityGroup?: string;
  concept?: string;
  capacityQuantity: number;
  distinctiveCode?: string;
  services?: ClinicalService[]; // Ahora puede tener varios servicios
}

export interface CreateServiceCapacityDto {
  headquarters: string;
  headquartersName: string;
  capacityGroup?: string;
  concept?: string;
  capacityQuantity: number;
  distinctiveCode?: string;
  serviceIds: string[];
}
