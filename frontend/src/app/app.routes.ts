import { Routes } from '@angular/router';
import { guestGuard, authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';
import { ForbiddenComponent } from './auth/pages/forbidden.component';
import { LoginComponent } from './auth/pages/login.component';
import { PrivateLayoutComponent } from './layouts/private-layout.component';
import { UserFormComponent } from './users/pages/user-form.component';
import { UsersListComponent } from './users/pages/users-list.component';
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
import { SurveyListComponent } from './surveys/pages/survey-list/survey-list.component';
import { SurveyBuilderComponent } from './surveys/pages/survey-builder/survey-builder.component';
import { PublicSurveyFormComponent } from './surveys/pages/public-survey-form/public-survey-form.component';
import { SurveyResultsComponent } from './surveys/pages/survey-results/survey-results.component';
import { CounterpartRequestsListComponent } from './counterpart-requests/pages/counterpart-requests-list.component';
import { CounterpartRequestFormComponent } from './counterpart-requests/pages/counterpart-request-form.component';
import { TeachingServiceCommitteesPageComponent } from './teaching-service-committees/pages/teaching-service-committees-page.component';

import { StudentList } from './students/student-list/student-list';
import { StudentTypeList } from './student-types/student-type-list/student-type-list';
import { StudentTypeDetail } from './student-types/student-type-detail/student-type-detail';
import { StudentForm } from './students/student-form/student-form';
import { StudentDetail } from './students/student-detail/student-detail';

import { TeacherListComponent } from './teachers/teacher-list/teacher-list.component';
import { TeacherFormComponent } from './teachers/teacher-form/teacher-form.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'forbidden', component: ForbiddenComponent, canActivate: [authGuard] },
  { path: 'public/inductions/access/:token', component: PublicInductionCheckinComponent },
  { path: 'public/surveys/:token', component: PublicSurveyFormComponent },
  { path: 'public/surveys/open/:id', component: PublicSurveyFormComponent },
  {
    path: '',
    component: PrivateLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    children: [
      { path: '', redirectTo: 'institutions/list', pathMatch: 'full' },
      { path: 'institutions/list', component: InstitutionsListComponent, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
      { path: 'institutions/types', component: TypesListComponent },
      { path: 'institutions/types/new', component: TypeDetailComponent },
      { path: 'institutions/types/:id', component: TypeDetailComponent },
      { path: 'institutions/register', component: InstitutionFormComponent },
      { path: 'institutions/:id/edit', component: InstitutionFormComponent },
      { path: 'institutions/:id', component: InstitutionDetailComponent, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
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
      {
        path: 'dashboard-analytics',
        loadComponent: () => import('./dashboard-analytics/pages/dashboard-analytics.component').then((m) => m.DashboardAnalyticsComponent),
        data: { roles: ['HOSPITAL'] },
      },
      {
        path: 'capacity-analysis',
        loadComponent: () => import('./capacity-analysis/pages/capacity-analysis.component').then((m) => m.CapacityAnalysisComponent),
        data: { roles: ['HOSPITAL'] },
      },
      {
        path: 'autoevaluations',
        loadComponent: () => import('./autoevaluations/pages/autoevaluations-page.component').then((m) => m.AutoevaluationsPageComponent),
        data: { roles: ['HOSPITAL', 'INSTITUCION'] },
      },
      {
        path: 'autoevaluations/new',
        loadComponent: () =>
          import('./autoevaluations/pages/autoevaluation-process-page.component').then((m) => m.AutoevaluationProcessPageComponent),
        data: { roles: ['HOSPITAL', 'INSTITUCION'], mode: 'create' },
      },
      {
        path: 'autoevaluations/:id/edit',
        loadComponent: () =>
          import('./autoevaluations/pages/autoevaluation-process-page.component').then((m) => m.AutoevaluationProcessPageComponent),
        data: { roles: ['HOSPITAL', 'INSTITUCION'], mode: 'edit' },
      },
      {
        path: 'autoevaluations/:id',
        loadComponent: () =>
          import('./autoevaluations/pages/autoevaluation-process-page.component').then((m) => m.AutoevaluationProcessPageComponent),
        data: { roles: ['HOSPITAL', 'INSTITUCION'], mode: 'detail' },
      },
      { path: 'inductions', component: InductionListComponent },
      { path: 'inductions/new', component: InductionFormComponent },
      { path: 'inductions/:id/edit', component: InductionFormComponent },
      { path: 'inductions/:id', component: InductionDetailComponent },
      { path: 'surveys', component: SurveyListComponent },
      { path: 'surveys/new', component: SurveyBuilderComponent },
      { path: 'surveys/:id/edit', component: SurveyBuilderComponent },
      { path: 'surveys/:id/results', component: SurveyResultsComponent },
      { path: 'counterpart-requests', component: CounterpartRequestsListComponent, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
      { path: 'counterpart-requests/new', component: CounterpartRequestFormComponent, data: { roles: ['HOSPITAL'] } },
      { path: 'teaching-service-committees', component: TeachingServiceCommitteesPageComponent, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
      { path: 'students', component: StudentList, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
      { path: 'students/new', component: StudentForm, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
      { path: 'students/:id/edit', component: StudentForm, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
      { path: 'students/:id', component: StudentDetail, data: { roles: ['HOSPITAL', 'INSTITUCION'] } },
      { path: 'student-types', component: StudentTypeList },
      { path: 'student-types/new', component: StudentTypeDetail },
      { path: 'student-types/:id', component: StudentTypeDetail },
      { path: 'users', component: UsersListComponent },
      { path: 'users/new', component: UserFormComponent },
      { path: 'users/:id/edit', component: UserFormComponent },
      { path: 'teachers', component: TeacherListComponent },
      { path: 'teachers/new', component: TeacherFormComponent },
      { path: 'teachers/:id/edit', component: TeacherFormComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
