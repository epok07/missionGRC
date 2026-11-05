import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import type { DashboardData } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';

export const dashboardResolver: ResolveFn<DashboardData> = () => {
  return inject(WorkspaceService).dashboard();
};
