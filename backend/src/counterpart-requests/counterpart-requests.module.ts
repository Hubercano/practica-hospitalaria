import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CounterpartRequestsController } from './counterpart-requests.controller';
import { CounterpartRequestsService } from './counterpart-requests.service';

@Module({
  imports: [PrismaModule],
  controllers: [CounterpartRequestsController],
  providers: [CounterpartRequestsService],
  exports: [CounterpartRequestsService],
})
export class CounterpartRequestsModule {}