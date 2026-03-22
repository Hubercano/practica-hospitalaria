import { Module } from '@nestjs/common';
import { ServiceCapacityService } from './service-capacity.service';
import { ServiceCapacityController } from './service-capacity.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCapacityController],
  providers: [ServiceCapacityService],
})
export class ServiceCapacityModule {}
