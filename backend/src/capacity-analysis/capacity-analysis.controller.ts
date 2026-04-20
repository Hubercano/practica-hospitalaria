import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CapacityAnalysisService } from './capacity-analysis.service';

@Roles(UserRole.HOSPITAL)
@Controller('capacity-analysis')
export class CapacityAnalysisController {
  constructor(private readonly service: CapacityAnalysisService) {}

  @Get('report')
  getReport(
    @Query('years') years?: string,
    @Query('months') months?: string,
    @Query('institutionIds') institutionIds?: string,
    @Query('programIds') programIds?: string,
    @Query('capacityGroups') capacityGroups?: string,
  ) {
    return this.service.getReport({
      years,
      months,
      institutionIds,
      programIds,
      capacityGroups,
    });
  }
}
