import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard } from './core/auth.guard';
import { dashboardResolver } from './features/dashboard/dashboard.resolver';
import {
  boardResolver,
  insightsResolver,
  meetingsResolver,
  objectivesResolver,
  risksResolver,
  tasksResolver,
  tprmResolver,
} from './features/workspace.resolvers';
import { ShellComponent } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    title: 'Sign in',
    data: {
      description:
        'MissionGRC is a daily operating workspace for GRC specialists: open items, tasks, decision-room meetings, daily objectives, third-party risk, and board-ready narratives. Trust is the work.',
      robots: 'index, follow',
      ogType: 'website',
    },
    loadComponent: () => import('./features/login/login').then((module) => module.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: ShellComponent,
    children: [
      {
        path: '',
        title: 'Today',
        data: {
          description:
            'Your daily GRC command center: open items, tasks, meetings, objectives, third-party risk, and the executive narrative.',
        },
        resolve: {
          dashboard: dashboardResolver,
        },
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((module) => module.DashboardPage),
      },
      {
        path: 'tasks',
        title: 'Tasks',
        data: { description: 'Daily GRC execution board, grouped by flow state.' },
        resolve: { tasks: tasksResolver },
        loadComponent: () => import('./features/tasks/tasks').then((module) => module.TasksPage),
      },
      {
        path: 'calendar',
        title: 'Decision room',
        data: { description: 'Meetings, decisions, vendor reviews, and audit checkpoints.' },
        resolve: { meetings: meetingsResolver },
        loadComponent: () =>
          import('./features/calendar/calendar').then((module) => module.CalendarPage),
      },
      {
        path: 'objectives',
        title: 'Daily objectives',
        data: { description: 'Set the pace for the day and build a visible consistency streak.' },
        resolve: { plan: objectivesResolver },
        loadComponent: () =>
          import('./features/objectives/objectives').then((module) => module.ObjectivesPage),
      },
      {
        path: 'risks',
        title: 'Open items',
        data: { description: 'Risks, issues, decisions, and actions with clear ownership.' },
        resolve: { risks: risksResolver },
        loadComponent: () =>
          import('./features/risks/risks').then((module) => module.RisksPage),
      },
      {
        path: 'tprm',
        title: 'Third-party risk',
        data: { description: 'Vendor reviews, evidence gates, and concentration risk.' },
        resolve: { vendors: tprmResolver },
        loadComponent: () => import('./features/tprm/tprm').then((module) => module.TprmPage),
      },
      {
        path: 'board',
        title: 'Board room',
        data: {
          description:
            'Board and steering narratives that translate risk into business decisions.',
        },
        resolve: { briefs: boardResolver },
        loadComponent: () => import('./features/board/board').then((module) => module.BoardPage),
      },
      {
        path: 'insights',
        title: 'Trust library',
        data: {
          description:
            'Quotes and questions that turn technical reality into business language.',
        },
        resolve: { insights: insightsResolver },
        loadComponent: () =>
          import('./features/insights/insights').then((module) => module.InsightsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
