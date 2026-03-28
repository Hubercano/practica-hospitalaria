// src/app/core/models/rotation-area.model.ts
export interface RotationArea {
  id: string;
  name: string;
  programId: string;
  durationWeeks?: number;
  maxStudents?: number;
  state?: 'ACTIVE' | 'INACTIVE';
  serviceIds?: string[];
}

export interface CreateRotationAreaDto {
  name: string;
  programId: string;
  durationWeeks?: number;
  maxStudents?: number;
  serviceIds?: string[];
  state?: 'ACTIVE' | 'INACTIVE';
}
