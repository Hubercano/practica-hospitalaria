import { Routes } from '@angular/router';
import { TypesListComponent } from './institutions/components/types-list/types-list.component';
import { TypeDetailComponent } from './institutions/components/type-detail/type-detail.component';
import { InstitutionFormComponent } from './institutions/components/institution-form/institution-form.component';
import { InstitutionsListComponent } from './institutions/components/institutions-list/institutions-list.component';
import { InstitutionDetailComponent } from './institutions/components/institution-detail/institution-detail.component';
import { ServiceListComponent } from './clinical-services/pages/service-list/service-list.component';
import { ServiceFormComponent } from './clinical-services/pages/service-form/service-form.component';
import { ServiceCapacityListComponent } from './service-capacity/pages/service-capacity-list/service-capacity-list.component';
import { ServiceCapacityFormComponent } from './service-capacity/pages/service-capacity-form/service-capacity-form.component';
import { ProgramListComponent } from './academic-programs/pages/program-list/program-list.component';
import { ProgramFormComponent } from './academic-programs/pages/program-form/program-form.component';
import { ProgramDetailComponent } from './academic-programs/pages/program-detail/program-detail.component';
import { RotationScheduleListComponent } from './rotation-schedules/pages/rotation-schedule-list/rotation-schedule-list.component';
import { RotationScheduleFormComponent } from './rotation-schedules/pages/rotation-schedule-form/rotation-schedule-form.component';
import { InductionListComponent } from './inductions/pages/induction-list/induction-list.component';
import { InductionFormComponent } from './inductions/pages/induction-form/induction-form.component';
import { InductionDetailComponent } from './inductions/pages/induction-detail/induction-detail.component';
import { PublicInductionCheckinComponent } from './inductions/pages/public-induction-checkin/public-induction-checkin.component';

import { StudentList } from './students/student-list/student-list';
import { StudentTypeList } from './student-types/student-type-list/student-type-list';
import { StudentTypeDetail } from './student-types/student-type-detail/student-type-detail';
import { StudentForm } from './students/student-form/student-form';
import { StudentDetail } from './students/student-detail/student-detail';

import { TeacherListComponent } from './teachers/teacher-list/teacher-list.component';
import { TeacherFormComponent } from './teachers/teacher-form/teacher-form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'institutions/list', pathMatch: 'full' },
  // Existing
  { path: 'institutions/list', component: InstitutionsListComponent },
  { path: 'institutions/types', component: TypesListComponent },
  { path: 'institutions/types/new', component: TypeDetailComponent },
  { path: 'institutions/types/:id', component: TypeDetailComponent },
  { path: 'institutions/register', component: InstitutionFormComponent },
  { path: 'institutions/:id/edit', component: InstitutionFormComponent },
  { path: 'institutions/:id', component: InstitutionDetailComponent },
  
  // New Modules
  { path: 'clinical-services', component: ServiceListComponent },
  { path: 'clinical-services/new', component: ServiceFormComponent },
  { path: 'clinical-services/:id', component: ServiceFormComponent },
  { path: 'service-capacity', component: ServiceCapacityListComponent },
  { path: 'service-capacity/new', component: ServiceCapacityFormComponent },
  { path: 'service-capacity/:id', component: ServiceCapacityFormComponent },
  { path: 'academic-programs', component: ProgramListComponent },
  { path: 'academic-programs/new', component: ProgramFormComponent },
  { path: 'academic-programs/:id/edit', component: ProgramFormComponent },
  { path: 'academic-programs/:id', component: ProgramDetailComponent },
  { path: 'rotation-schedules', component: RotationScheduleListComponent },
  { path: 'rotation-schedules/new', component: RotationScheduleFormComponent },
  { path: 'rotation-schedules/:id/edit', component: RotationScheduleFormComponent },

  // Inductions Module
  { path: 'inductions', component: InductionListComponent },
  { path: 'inductions/new', component: InductionFormComponent },
  { path: 'inductions/:id/edit', component: InductionFormComponent },
  { path: 'inductions/:id', component: InductionDetailComponent },
  { path: 'public/inductions/access/:token', component: PublicInductionCheckinComponent },

  // Students Modules
  { path: 'students', component: StudentList },
  { path: 'students/new', component: StudentForm },
  { path: 'students/:id/edit', component: StudentForm },
  { path: 'students/:id', component: StudentDetail },
  { path: 'student-types', component: StudentTypeList },
  { path: 'student-types/new', component: StudentTypeDetail },
  { path: 'student-types/:id', component: StudentTypeDetail },

  // Teachers Modules
  { path: 'teachers', component: TeacherListComponent },
  { path: 'teachers/new', component: TeacherFormComponent },
  { path: 'teachers/:id/edit', component: TeacherFormComponent }
];
