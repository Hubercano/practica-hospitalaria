import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SubmitSurveyResponseDto } from './dto/submit-survey-response.dto';
import { SurveysService } from './surveys.service';

@Controller('public-surveys')
export class SurveysPublicController {
  constructor(private readonly surveysService: SurveysService) {}

  @Get(':token')
  getPublicSurvey(@Param('token') token: string) {
    return this.surveysService.getPublicSurveyByToken(token);
  }

  @Post(':token/submit')
  submitPublicSurvey(
    @Param('token') token: string,
    @Body() dto: SubmitSurveyResponseDto,
    @Req() request: Request,
  ) {
    return this.surveysService.submitPublicSurvey(token, dto, request.ip, request.headers['user-agent']);
  }

  @Get('open/:surveyId')
  getOpenAccessSurvey(@Param('surveyId') surveyId: string) {
    return this.surveysService.getOpenAccessSurvey(surveyId);
  }

  @Post('open/:surveyId/submit')
  submitOpenAccessSurvey(
    @Param('surveyId') surveyId: string,
    @Body() dto: SubmitSurveyResponseDto,
    @Req() request: Request,
  ) {
    return this.surveysService.submitOpenAccessSurvey(surveyId, dto, request.ip, request.headers['user-agent']);
  }
}