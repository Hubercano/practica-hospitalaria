import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { AssignSurveyToRotationDto } from './dto/assign-survey-to-rotation.dto';
import { ReorderSurveyQuestionsDto } from './dto/reorder-survey-questions.dto';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  createSurvey(@Body() dto: CreateSurveyDto) {
    return this.surveysService.createSurvey(dto);
  }

  @Get()
  findSurveys(@Query('status') status?: 'ACTIVE' | 'INACTIVE') {
    return this.surveysService.findSurveys(status);
  }

  @Get(':id')
  findSurvey(@Param('id') id: string) {
    return this.surveysService.findSurveyById(id);
  }

  @Patch(':id')
  updateSurvey(@Param('id') id: string, @Body() dto: UpdateSurveyDto) {
    return this.surveysService.updateSurvey(id, dto);
  }

  @Delete(':id')
  removeSurvey(@Param('id') id: string) {
    return this.surveysService.removeSurvey(id);
  }

  @Post(':id/publish')
  publishSurvey(@Param('id') id: string) {
    return this.surveysService.publishSurvey(id);
  }

  @Post(':id/questions')
  createQuestion(@Param('id') surveyId: string, @Body() dto: CreateSurveyQuestionDto) {
    return this.surveysService.createQuestion(surveyId, dto);
  }

  @Patch(':id/questions/reorder')
  reorderQuestions(@Param('id') surveyId: string, @Body() dto: ReorderSurveyQuestionsDto) {
    return this.surveysService.reorderQuestions(surveyId, dto);
  }

  @Patch(':id/questions/:questionId')
  updateQuestion(
    @Param('id') surveyId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateSurveyQuestionDto,
  ) {
    return this.surveysService.updateQuestion(surveyId, questionId, dto);
  }

  @Delete(':id/questions/:questionId')
  removeQuestion(@Param('id') surveyId: string, @Param('questionId') questionId: string) {
    return this.surveysService.removeQuestion(surveyId, questionId);
  }

  @Post('assignments/rotation')
  assignSurveyToRotation(@Body() dto: AssignSurveyToRotationDto) {
    return this.surveysService.assignSurveyToRotation(dto);
  }

  @Get('assignments/rotation/:rotationScheduleId')
  getRotationAssignment(@Param('rotationScheduleId') rotationScheduleId: string) {
    return this.surveysService.getRotationAssignment(rotationScheduleId);
  }

  @Get(':id/stats')
  getSurveyStats(@Param('id') surveyId: string) {
    return this.surveysService.getSurveyStats(surveyId);
  }

  @Post('dispatch/run')
  runDispatchJob() {
    return this.surveysService.dispatchDueAssignments();
  }

  @Post('assignments/:assignmentId/resend')
  resendAssignment(@Param('assignmentId') assignmentId: string) {
    return this.surveysService.resendAssignment(assignmentId);
  }
}
