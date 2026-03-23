// src/app/core/models/rotation-area.model.ts
export interface RotationArea {
  id: string;
  name: string;
  programId: string;
  durationWeeks?: number;
  maxStudents?: number;
}

export interface CreateRotationAreaDto {
  name: string;
  programId: string;
  durationWeeks?: number;
  maxStudents?: number;
  serviceIds?: string[];
}
