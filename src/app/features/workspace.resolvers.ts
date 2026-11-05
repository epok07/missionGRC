import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import type {
  BoardBrief,
  DailyPlan,
  Insight,
  Meeting,
  RiskItem,
  Task,
  Vendor,
} from '../../shared/models';
import { dateKey } from '../core/ui';
import { WorkspaceService } from '../core/workspace.service';

export const tasksResolver: ResolveFn<Task[]> = () => inject(WorkspaceService).tasks();

export const meetingsResolver: ResolveFn<Meeting[]> = () => inject(WorkspaceService).meetings();

export const objectivesResolver: ResolveFn<DailyPlan> = (route) => {
  const date = route.queryParamMap.get('date') ?? dateKey();
  return inject(WorkspaceService).plan(date);
};

export const risksResolver: ResolveFn<RiskItem[]> = () => inject(WorkspaceService).risks();

export const tprmResolver: ResolveFn<Vendor[]> = () => inject(WorkspaceService).vendors();

export const boardResolver: ResolveFn<BoardBrief[]> = () => inject(WorkspaceService).boardBriefs();

export const insightsResolver: ResolveFn<Insight[]> = () => inject(WorkspaceService).insights();
