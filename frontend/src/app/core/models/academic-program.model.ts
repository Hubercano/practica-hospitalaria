// src/app/core/models/academic-program.model.ts
import { RotationArea } from './rotation-area.model';

export interface AcademicProgram {
  id: string;
  name: string;
  level: string;
  institutionId: string;
  institution?: any;
  technicalAnnex?: string;
  state?: 'ACTIVE' | 'INACTIVE';
  rotationAreas?: RotationArea[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAcademicProgramDto {
  name: string;
  level: string;
  institutionId: string;
  technicalAnnex?: string;
  state?: 'ACTIVE' | 'INACTIVE';
}
