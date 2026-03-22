import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    PrismaModule, 
    InstitutionsModule,
    AcademicProgramsModule,
    ClinicalServicesModule,
    RotationAreasModule,
    ServiceCapacityModule,
    StudentTypesModule,
    StudentsModule,
    TeachersModule
    ,RotationSchedulesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
