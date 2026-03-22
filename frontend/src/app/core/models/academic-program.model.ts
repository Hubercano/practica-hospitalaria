// src/app/core/models/academic-program.model.ts
import { RotationArea } from './rotation-area.model';

export interface AcademicProgram {
  id: string;
  name: string;
  level: string;
  institutionId: string;
  institution?: any;
  technicalAnnex?: string;
  rotationAreas?: RotationArea[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAcademicProgramDto {
  name: string;
  level: string;
  institutionId: string;
  technicalAnnex?: string;
}
