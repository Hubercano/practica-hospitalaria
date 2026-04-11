import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { PrismaModule } from './prisma/prisma.module';
import { AcademicProgramsModule } from './academic-programs/academic-programs.module';
import { ClinicalServicesModule } from './clinical-services/clinical-services.module';
import { RotationAreasModule } from './rotation-areas/rotation-areas.module';
import { ServiceCapacityModule } from './service-capacity/service-capacity.module';
import { StudentTypesModule } from './student-types/student-types.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { RotationSchedulesModule } from './rotation-schedules/rotation-schedules.module';
import { InductionsModule } from './inductions/inductions.module';
import { SurveysModule } from './surveys/surveys.module';
import { CounterpartRequestsModule } from './counterpart-requests/counterpart-requests.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    PrismaModule, 
    InstitutionsModule,
    AcademicProgramsModule,
    ClinicalServicesModule,
    RotationAreasModule,
    ServiceCapacityModule,
    StudentTypesModule,
    StudentsModule,
    TeachersModule
    ,RotationSchedulesModule,
    InductionsModule,
    SurveysModule,
    CounterpartRequestsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
