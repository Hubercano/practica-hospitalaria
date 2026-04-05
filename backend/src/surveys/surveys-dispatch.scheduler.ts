import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SurveysService } from './surveys.service';

@Injectable()
export class SurveysDispatchScheduler {
  private readonly logger = new Logger(SurveysDispatchScheduler.name);

  constructor(private readonly surveysService: SurveysService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async dispatchDueSurveys() {
    try {
      const result = await this.surveysService.dispatchDueAssignments();
      if (result.sent > 0) {
        this.logger.log(`Despacho de encuestas ejecutado: ${result.sent} envíos preparados.`);
      }
    } catch (error: any) {
      this.logger.error(`Error ejecutando despacho automático de encuestas: ${error?.message || error}`);
    }
  }
}
