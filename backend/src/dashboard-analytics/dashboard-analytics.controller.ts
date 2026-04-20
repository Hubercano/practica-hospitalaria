import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

@Roles(UserRole.HOSPITAL)
@Controller('dashboard-analytics')
export class DashboardAnalyticsController {
  constructor(private readonly service: DashboardAnalyticsService) {}

  @Get('capacity-installed')
  getCapacityInstalledAnalytics(
    @Query('years') years?: string,
    @Query('months') months?: string,
    @Query('institutionIds') institutionIds?: string,
    @Query('programIds') programIds?: string,
    @Query('teacherIds') teacherIds?: string,
  ) {
    return this.service.getCapacityInstalledAnalytics({
      years,
      months,
      institutionIds,
      programIds,
      teacherIds,
    });
  }
}