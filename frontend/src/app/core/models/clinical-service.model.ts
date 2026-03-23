// src/app/core/models/clinical-service.model.ts
import { ServiceCapacity } from './service-capacity.model';

export interface ClinicalService {
  id: string;
  code: string; // DHSS
  name: string;
  venueName?: string;
  venueSequence?: number;
  venueCode?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  capacities?: ServiceCapacity[];
}

export interface CreateClinicalServiceDto {
  code: string;
  name: string;
  venueName?: string;
  venueSequence?: number;
  venueCode?: string;
  description?: string;
  isActive?: boolean;
}
