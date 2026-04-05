import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type SurveyStatus = 'ACTIVE' | 'INACTIVE';
export type SurveyQuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SCALE' | 'DROPDOWN';

export interface SurveyQuestionOption {
  id?: string;
  label: string;
  value: string;
  orderIndex?: number;
}

export interface SurveyQuestion {
  id?: string;
  title: string;
  description?: string;
  type: SurveyQuestionType;
  isRequired: boolean;
  orderIndex: number;
  scaleMin?: number;
  scaleMax?: number;
  scaleStep?: number;
  options?: SurveyQuestionOption[];
}

export interface Survey {
  id: string;
  name: string;
  description?: string;
  status: SurveyStatus;
  isPublished: boolean;
  isOpenAccess?: boolean;
  questions?: SurveyQuestion[];
}

@Injectable({ providedIn: 'root' })
export class SurveysService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/surveys';
  private readonly publicUrl = 'http://localhost:3000/public-surveys';

  getSurveys(status?: SurveyStatus): Observable<Survey[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<Survey[]>(this.apiUrl, { params });
  }

  getSurvey(id: string): Observable<Survey> {
    return this.http.get<Survey>(`${this.apiUrl}/${id}`);
  }

  createSurvey(payload: { name: string; description?: string; status?: SurveyStatus; isOpenAccess?: boolean }): Observable<Survey> {
    return this.http.post<Survey>(this.apiUrl, payload);
  }

  updateSurvey(id: string, payload: Partial<Survey>): Observable<Survey> {
    return this.http.patch<Survey>(`${this.apiUrl}/${id}`, payload);
  }

  deleteSurvey(id: string): Observable<Survey> {
    return this.http.delete<Survey>(`${this.apiUrl}/${id}`);
  }

  publishSurvey(id: string): Observable<Survey> {
    return this.http.post<Survey>(`${this.apiUrl}/${id}/publish`, {});
  }

  createQuestion(surveyId: string, payload: SurveyQuestion): Observable<SurveyQuestion> {
    return this.http.post<SurveyQuestion>(`${this.apiUrl}/${surveyId}/questions`, payload);
  }

  updateQuestion(surveyId: string, questionId: string, payload: Partial<SurveyQuestion>): Observable<SurveyQuestion> {
    return this.http.patch<SurveyQuestion>(`${this.apiUrl}/${surveyId}/questions/${questionId}`, payload);
  }

  deleteQuestion(surveyId: string, questionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${surveyId}/questions/${questionId}`);
  }

  reorderQuestions(surveyId: string, questions: Array<{ id: string; orderIndex: number }>): Observable<Survey> {
    return this.http.patch<Survey>(`${this.apiUrl}/${surveyId}/questions/reorder`, { questions });
  }

  assignSurveyToRotation(rotationScheduleId: string, surveyId: string, sendAfterRotationEnd = true): Observable<any> {
    return this.http.post(`${this.apiUrl}/assignments/rotation`, { rotationScheduleId, surveyId, sendAfterRotationEnd });
  }

  getRotationAssignment(rotationScheduleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/assignments/rotation/${rotationScheduleId}`);
  }

  getSurveyStats(surveyId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${surveyId}/stats`);
  }

  getPublicSurvey(token: string): Observable<any> {
    return this.http.get<any>(`${this.publicUrl}/${token}`);
  }

  getOpenAccessSurvey(surveyId: string): Observable<any> {
    return this.http.get<any>(`${this.publicUrl}/open/${surveyId}`);
  }

  submitPublicSurvey(token: string, payload: { answers: Array<{ questionId: string; answerText?: string; answerNumber?: number; answerOptions?: string[] }> }): Observable<any> {
    return this.http.post<any>(`${this.publicUrl}/${token}/submit`, payload);
  }

  submitOpenAccessSurvey(surveyId: string, payload: { answers: Array<{ questionId: string; answerText?: string; answerNumber?: number; answerOptions?: string[] }> }): Observable<any> {
    return this.http.post<any>(`${this.publicUrl}/open/${surveyId}/submit`, payload);
  }

  getOpenAccessLink(surveyId: string): string {
    return `http://localhost:4200/public/surveys/open/${surveyId}`;
  }
}
