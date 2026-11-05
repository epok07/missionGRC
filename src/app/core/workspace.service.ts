import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  BoardBrief,
  BoardDraft,
  DailyPlan,
  DashboardData,
  Insight,
  Meeting,
  MeetingDraft,
  ObjectiveCategory,
  ObjectiveDraft,
  RiskDraft,
  RiskItem,
  RiskStatus,
  Task,
  TaskDraft,
  TaskStatus,
  Vendor,
  VendorStatus,
} from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);

  dashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>('/api/dashboard');
  }

  tasks(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks');
  }

  createTask(draft: TaskDraft): Observable<Task> {
    return this.http.post<Task>('/api/tasks', draft);
  }

  updateTask(id: string, patch: Partial<TaskDraft> & { status?: TaskStatus }): Observable<Task> {
    return this.http.patch<Task>(`/api/tasks/${encodeURIComponent(id)}`, patch);
  }

  deleteTask(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/tasks/${encodeURIComponent(id)}`);
  }

  risks(): Observable<RiskItem[]> {
    return this.http.get<RiskItem[]>('/api/risks');
  }

  createRisk(draft: RiskDraft): Observable<RiskItem> {
    return this.http.post<RiskItem>('/api/risks', draft);
  }

  updateRisk(id: string, patch: { status?: RiskStatus; owner?: string; due?: string }): Observable<RiskItem> {
    return this.http.patch<RiskItem>(`/api/risks/${encodeURIComponent(id)}`, patch);
  }

  meetings(from?: string, to?: string): Observable<Meeting[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Meeting[]>('/api/meetings', { params });
  }

  createMeeting(draft: MeetingDraft): Observable<Meeting> {
    return this.http.post<Meeting>('/api/meetings', draft);
  }

  deleteMeeting(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/meetings/${encodeURIComponent(id)}`);
  }

  vendors(): Observable<Vendor[]> {
    return this.http.get<Vendor[]>('/api/vendors');
  }

  updateVendor(
    id: string,
    patch: { status?: VendorStatus; progress?: number; reviewDue?: string },
  ): Observable<Vendor> {
    return this.http.patch<Vendor>(`/api/vendors/${encodeURIComponent(id)}`, patch);
  }

  boardBriefs(): Observable<BoardBrief[]> {
    return this.http.get<BoardBrief[]>('/api/board');
  }

  updateBoardBrief(id: string, patch: BoardDraft): Observable<BoardBrief> {
    return this.http.patch<BoardBrief>(`/api/board/${encodeURIComponent(id)}`, patch);
  }

  plan(date: string): Observable<DailyPlan> {
    return this.http.get<DailyPlan>('/api/objectives', { params: { date } });
  }

  objectiveHistory(days = 14): Observable<Array<{ date: string; done: number; total: number }>> {
    return this.http.get<Array<{ date: string; done: number; total: number }>>(
      '/api/objectives/history',
      { params: { days } },
    );
  }

  setIntent(date: string, intent: string): Observable<DailyPlan> {
    return this.http.patch<DailyPlan>(`/api/objectives/${date}/intent`, { intent });
  }

  addObjective(date: string, draft: ObjectiveDraft): Observable<DailyPlan> {
    return this.http.post<DailyPlan>(`/api/objectives/${date}/objectives`, draft);
  }

  updateObjective(
    date: string,
    id: string,
    patch: { done?: boolean; text?: string; category?: ObjectiveCategory },
  ): Observable<DailyPlan> {
    return this.http.patch<DailyPlan>(`/api/objectives/${date}/objectives/${encodeURIComponent(id)}`, patch);
  }

  deleteObjective(date: string, id: string): Observable<DailyPlan> {
    return this.http.delete<DailyPlan>(
      `/api/objectives/${date}/objectives/${encodeURIComponent(id)}`,
    );
  }

  insights(): Observable<Insight[]> {
    return this.http.get<Insight[]>('/api/insights');
  }
}
