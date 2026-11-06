import {
  HttpErrorResponse,
  HttpEvent,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { DOCUMENT, Injectable, inject } from '@angular/core';
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';
import { Observable, from, of, switchMap, throwError } from 'rxjs';
import type {
  BoardBrief,
  BoardDraft,
  DailyPlan,
  DashboardData,
  DashboardPulse,
  Insight,
  Meeting,
  MeetingDraft,
  Objective,
  ObjectiveCategory,
  ObjectiveDraft,
  Priority,
  RiskDraft,
  RiskItem,
  RiskStatus,
  Task,
  TaskDraft,
  TaskStatus,
  UserSummary,
  Vendor,
  VendorStatus,
  WeekPoint,
  Workstream,
} from '../../../shared/models';
import { renderMarkdown } from '../../../shared/markdown';

/**
 * Browser-only stand-in for the Express API.
 *
 * GitHub Pages cannot execute the Node server, so the static proof-of-concept
 * ships the same seeded workspace as JSON and emulates the API surface in the
 * browser. Changes stay in localStorage and never leave the visitor's machine.
 */

const STATE_KEY = 'missiongrc.demo.state.v1';
const SESSION_KEY = 'missiongrc.demo.session.v1';
const STATE_VERSION = 1;

const PRIORITY: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const TASK_ORDER: Record<TaskStatus, number> = { doing: 0, todo: 1, blocked: 2, done: 3 };
const RISK_ORDER: Record<RiskStatus, number> = {
  open: 0,
  'in-progress': 1,
  monitoring: 2,
  closed: 3,
};
const WORKSTREAMS: Workstream[] = [
  'triage',
  'decision',
  'evidence',
  'tprm',
  'board',
  'audit',
  'relationship',
];
const RISK_STATUSES: RiskStatus[] = ['open', 'in-progress', 'monitoring', 'closed'];
const RISK_TYPES = ['risk', 'issue', 'decision', 'action'] as const;
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
const VENDOR_STATUSES: VendorStatus[] = [
  'not-started',
  'in-review',
  'awaiting-vendor',
  'complete',
  'escalated',
];
const BOARD_STATUSES = ['drafting', 'in-review', 'final'] as const;
const MEETING_TYPES = ['decision', 'vendor', 'audit', 'board', 'one-on-one', 'focus'] as const;
const OBJECTIVE_CATEGORIES: ObjectiveCategory[] = [
  'judgment',
  'execution',
  'influence',
  'evidence',
  'relationship',
];

interface DemoAccount extends UserSummary {
  password: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'admin',
    password: 'Dare2Hack$',
    name: 'Alex Morgan',
    role: 'GRC Lead',
    initials: 'AM',
    focus: 'Make risk decisions visible, intentional, and owned.',
  },
  {
    username: 'ki',
    password: 'Dare2ImpressU',
    name: 'Ki',
    role: 'GRC Specialist',
    initials: 'KI',
    focus: 'Build trust through consistency, one documented decision at a time.',
  },
];

interface DemoSeedFile {
  generatedAt: string;
  tasks: Task[];
  risks: RiskItem[];
  meetings: Meeting[];
  vendors: Vendor[];
  board: BoardBrief[];
  objectives: DailyPlan[];
  insights: Insight[];
}

interface DemoState {
  version: number;
  seedStamp: string;
  baseDate: string;
  tasks: Task[];
  risks: RiskItem[];
  meetings: Meeting[];
  vendors: Vendor[];
  board: BoardBrief[];
  objectives: DailyPlan[];
  insights: Insight[];
}

type RouteResult = {
  body: unknown;
  status?: number;
  persist?: boolean;
};

class DemoHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class DemoApiService {
  private readonly document = inject(DOCUMENT);
  private statePromise: Promise<DemoState> | null = null;
  private session: UserSummary | null | undefined;

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return from(this.loadState()).pipe(
      switchMap((state) => {
        try {
          const result = this.route(request, state);
          if (result.persist) {
            this.persist(state);
          }
          return of(
            new HttpResponse({
              status: result.status ?? 200,
              body: result.body,
              url: request.url,
            }),
          );
        } catch (error) {
          if (error instanceof DemoHttpError) {
            return throwError(
              () =>
                new HttpErrorResponse({
                  status: error.status,
                  error: { error: error.message },
                  url: request.url,
                }),
            );
          }
          return throwError(() => error);
        }
      }),
    );
  }

  /* --------------------------------------------------------------- storage */

  private async loadState(): Promise<DemoState> {
    if (!this.statePromise) {
      this.statePromise = this.fetchSeed();
    }
    return this.statePromise;
  }

  private async fetchSeed(): Promise<DemoState> {
    const url = new URL('demo-data.json', this.document.baseURI).toString();
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new DemoHttpError(
        503,
        `The demo workspace could not be loaded (${response.status}).`,
      );
    }

    const seed = (await response.json()) as DemoSeedFile;
    const today = todayKey();
    const stored = this.readStoredState();

    if (stored && stored.version === STATE_VERSION && stored.seedStamp === seed.generatedAt) {
      const elapsed = differenceInCalendarDays(parseISO(today), parseISO(stored.baseDate));
      return shiftState(stored, elapsed);
    }

    const seedDate = format(new Date(seed.generatedAt), 'yyyy-MM-dd');
    const elapsed = differenceInCalendarDays(parseISO(today), parseISO(seedDate));
    return shiftState(
      {
        version: STATE_VERSION,
        seedStamp: seed.generatedAt,
        baseDate: today,
        tasks: seed.tasks,
        risks: seed.risks,
        meetings: seed.meetings,
        vendors: seed.vendors,
        board: seed.board,
        objectives: seed.objectives,
        insights: seed.insights,
      },
      elapsed,
    );
  }

  private readStoredState(): DemoState | null {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? (JSON.parse(raw) as DemoState) : null;
    } catch {
      return null;
    }
  }

  private persist(state: DemoState): void {
    state.baseDate = todayKey();
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      // A private window may reject storage; the in-memory session still works.
    }
  }

  private currentSession(): UserSummary | null {
    if (this.session !== undefined) return this.session;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      this.session = raw ? (JSON.parse(raw) as UserSummary) : null;
    } catch {
      this.session = null;
    }
    return this.session;
  }

  private setSession(user: UserSummary | null): void {
    this.session = user;
    try {
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignore storage failures.
    }
  }

  /* ----------------------------------------------------------------- router */

  private route(request: HttpRequest<unknown>, state: DemoState): RouteResult {
    const url = new URL(request.url, 'http://demo.local');
    const path = url.pathname;
    const method = request.method.toUpperCase();

    if (method === 'POST' && path === '/api/auth/login') {
      return this.login(request.body);
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      this.setSession(null);
      return { body: { ok: true } };
    }

    const user = this.currentSession();
    if (path === '/api/auth/me' || path === '/api/session') {
      if (!user) throw new DemoHttpError(401, 'Please sign in to continue.');
      return { body: { user } };
    }
    if (!user) throw new DemoHttpError(401, 'Please sign in to continue.');

    if (method === 'GET' && path === '/api/dashboard') {
      return { body: this.dashboard(state, user) };
    }
    if (method === 'GET' && path === '/api/tasks') {
      return { body: sortTasks(state.tasks) };
    }
    if (method === 'POST' && path === '/api/tasks') {
      return { body: this.createTask(state, request.body as TaskDraft, user.name), status: 201, persist: true };
    }
    const taskMatch = /^\/api\/tasks\/([^/]+)$/.exec(path);
    if (taskMatch) {
      const id = decodeURIComponent(taskMatch[1] ?? '');
      if (method === 'PATCH') {
        return {
          body: this.updateTask(
            state,
            id,
            request.body as Partial<TaskDraft> & { status?: TaskStatus },
          ),
          persist: true,
        };
      }
      if (method === 'DELETE') {
        return { body: { ok: this.removeTask(state, id) }, persist: true };
      }
    }

    if (method === 'GET' && path === '/api/risks') {
      return { body: sortRisks(state.risks) };
    }
    if (method === 'POST' && path === '/api/risks') {
      return { body: this.createRisk(state, request.body as RiskDraft, user.name), status: 201, persist: true };
    }
    const riskMatch = /^\/api\/risks\/([^/]+)$/.exec(path);
    if (riskMatch && method === 'PATCH') {
      return {
        body: this.updateRisk(state, decodeURIComponent(riskMatch[1] ?? ''), request.body),
        persist: true,
      };
    }

    if (method === 'GET' && path === '/api/meetings') {
      return {
        body: this.listMeetings(
          state,
          url.searchParams.get('from') ?? undefined,
          url.searchParams.get('to') ?? undefined,
        ),
      };
    }
    if (method === 'POST' && path === '/api/meetings') {
      return { body: this.createMeeting(state, request.body as MeetingDraft, user.name), status: 201, persist: true };
    }
    const meetingMatch = /^\/api\/meetings\/([^/]+)$/.exec(path);
    if (meetingMatch && method === 'DELETE') {
      return {
        body: { ok: this.removeMeeting(state, decodeURIComponent(meetingMatch[1] ?? '')) },
        persist: true,
      };
    }

    if (method === 'GET' && path === '/api/vendors') {
      return { body: sortVendors(state.vendors) };
    }
    const vendorMatch = /^\/api\/vendors\/([^/]+)$/.exec(path);
    if (vendorMatch && method === 'PATCH') {
      return {
        body: this.updateVendor(state, decodeURIComponent(vendorMatch[1] ?? ''), request.body),
        persist: true,
      };
    }

    if (method === 'GET' && path === '/api/board') {
      return { body: sortBoard(state.board) };
    }
    const boardMatch = /^\/api\/board\/([^/]+)$/.exec(path);
    if (boardMatch && method === 'PATCH') {
      return {
        body: this.updateBoardBrief(
          state,
          decodeURIComponent(boardMatch[1] ?? ''),
          request.body as BoardDraft,
        ),
        persist: true,
      };
    }

    if (method === 'GET' && path === '/api/objectives/history') {
      const requested = Number(url.searchParams.get('days') ?? 14);
      const days = Number.isFinite(requested)
        ? Math.max(1, Math.min(60, Math.round(requested)))
        : 14;
      return { body: this.objectiveHistory(state, days) };
    }
    if (method === 'GET' && path === '/api/objectives') {
      return { body: getPlan(state, url.searchParams.get('date') ?? todayKey()) };
    }

    const intentMatch = /^\/api\/objectives\/([^/]+)\/intent$/.exec(path);
    if (intentMatch && method === 'PATCH') {
      const date = decodeURIComponent(intentMatch[1] ?? '');
      const intent =
        typeof (request.body as { intent?: unknown } | null)?.intent === 'string'
          ? ((request.body as { intent: string }).intent ?? '')
          : '';
      return { body: setPlanIntent(state, date, intent), persist: true };
    }

    const objectivesMatch = /^\/api\/objectives\/([^/]+)\/objectives$/.exec(path);
    if (objectivesMatch && method === 'POST') {
      return {
        body: addObjective(
          state,
          decodeURIComponent(objectivesMatch[1] ?? ''),
          request.body as ObjectiveDraft,
        ),
        status: 201,
        persist: true,
      };
    }

    const objectiveMatch = /^\/api\/objectives\/([^/]+)\/objectives\/([^/]+)$/.exec(path);
    if (objectiveMatch) {
      const date = decodeURIComponent(objectiveMatch[1] ?? '');
      const id = decodeURIComponent(objectiveMatch[2] ?? '');
      if (method === 'PATCH') {
        return {
          body: updateObjective(state, date, id, request.body as Partial<Objective>),
          persist: true,
        };
      }
      if (method === 'DELETE') {
        return { body: removeObjective(state, date, id), persist: true };
      }
    }

    if (method === 'GET' && path === '/api/insights') {
      return { body: state.insights };
    }

    throw new DemoHttpError(404, 'Not found.');
  }

  /* ------------------------------------------------------------------- auth */

  private login(body: unknown): RouteResult {
    const payload = (body ?? {}) as { username?: unknown; password?: unknown };
    const username = typeof payload.username === 'string' ? payload.username : '';
    const password = typeof payload.password === 'string' ? payload.password : '';
    const account = DEMO_ACCOUNTS.find(
      (candidate) =>
        candidate.username === username.trim().toLowerCase() && candidate.password === password,
    );
    if (!account) {
      throw new DemoHttpError(401, 'Those credentials do not match a workspace account.');
    }
    const user: UserSummary = {
      username: account.username,
      name: account.name,
      role: account.role,
      initials: account.initials,
      focus: account.focus,
    };
    this.setSession(user);
    return { body: { user } };
  }

  /* ------------------------------------------------------------------ tasks */

  private createTask(state: DemoState, draft: TaskDraft, owner: string): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: `task-${randomId()}`,
      ref: nextRef(
        state.tasks.map((item) => item.ref),
        'TSK',
      ),
      title: asString(draft?.title, 'Untitled task').slice(0, 160),
      notes: asString(draft?.notes).slice(0, 4000),
      status: 'todo',
      priority: asPriority(draft?.priority),
      due: isDate(draft?.due) ? draft.due : todayKey(),
      owner,
      workstream: WORKSTREAMS.includes(draft?.workstream as Workstream)
        ? (draft.workstream as Workstream)
        : 'triage',
      riskRef: asString(draft?.riskRef) || undefined,
      createdAt: now,
      updatedAt: now,
    };
    state.tasks.push(task);
    return task;
  }

  private updateTask(
    state: DemoState,
    id: string,
    patch: Partial<TaskDraft> & { status?: TaskStatus },
  ): Task {
    const current = state.tasks.find((task) => task.id === id);
    if (!current) throw new DemoHttpError(404, 'Task not found.');
    const next: Task = { ...current, updatedAt: new Date().toISOString() };
    if (typeof patch?.title === 'string' && patch.title.trim()) next.title = patch.title.trim();
    if (typeof patch?.notes === 'string') next.notes = patch.notes.slice(0, 4000);
    if (isDate(patch?.due)) next.due = patch.due;
    if (patch?.priority && PRIORITIES.includes(patch.priority)) next.priority = patch.priority;
    if (patch?.workstream && WORKSTREAMS.includes(patch.workstream)) {
      next.workstream = patch.workstream;
    }
    if (typeof patch?.riskRef === 'string') next.riskRef = patch.riskRef.trim() || undefined;
    const status = asTaskStatus(patch?.status);
    if (status) {
      next.status = status;
      if (status === 'done' && current.status !== 'done') next.completedAt = new Date().toISOString();
      if (status !== 'done') delete next.completedAt;
    }
    replaceById(state.tasks, next);
    return next;
  }

  private removeTask(state: DemoState, id: string): boolean {
    const index = state.tasks.findIndex((task) => task.id === id);
    if (index === -1) throw new DemoHttpError(404, 'Task not found.');
    state.tasks.splice(index, 1);
    return true;
  }

  /* ------------------------------------------------------------------ risks */

  private createRisk(state: DemoState, draft: RiskDraft, owner: string): RiskItem {
    const type = RISK_TYPES.includes(draft?.type as (typeof RISK_TYPES)[number])
      ? (draft.type as (typeof RISK_TYPES)[number])
      : 'risk';
    const prefix = { risk: 'RSK', issue: 'ISS', decision: 'DEC', action: 'ACT' }[type];
    const now = new Date().toISOString();
    const risk: RiskItem = {
      id: `item-${randomId()}`,
      ref: nextRef(
        state.risks.map((item) => item.ref),
        prefix,
      ),
      title: asString(draft?.title, 'Untitled open item').slice(0, 180),
      type,
      status: 'open',
      severity: asPriority(draft?.severity),
      owner: asString(draft?.owner, owner) || owner,
      businessUnit: asString(draft?.businessUnit, 'Enterprise'),
      due: isDate(draft?.due) ? draft.due : format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      framework: asString(draft?.framework, 'ISO 27001'),
      control: asString(draft?.control, 'To be mapped'),
      exposure: asString(draft?.exposure, 'Not yet quantified'),
      decisionNeeded: Boolean(draft?.decisionNeeded),
      createdAt: now,
      updatedAt: now,
      notes: asString(draft?.notes).slice(0, 6000),
    };
    state.risks.push(risk);
    return risk;
  }

  private updateRisk(state: DemoState, id: string, body: unknown): RiskItem {
    const patch = (body ?? {}) as { status?: unknown; owner?: unknown; due?: unknown; notes?: unknown };
    const current = state.risks.find((risk) => risk.id === id);
    if (!current) throw new DemoHttpError(404, 'Open item not found.');
    const next: RiskItem = { ...current, updatedAt: new Date().toISOString() };
    const status = RISK_STATUSES.includes(patch.status as RiskStatus)
      ? (patch.status as RiskStatus)
      : null;
    if (status) next.status = status;
    if (typeof patch.owner === 'string' && patch.owner.trim()) next.owner = patch.owner.trim();
    if (isDate(patch.due)) next.due = patch.due;
    if (typeof patch.notes === 'string') next.notes = patch.notes.slice(0, 6000);
    replaceById(state.risks, next);
    return next;
  }

  /* --------------------------------------------------------------- meetings */

  private listMeetings(state: DemoState, from?: string, to?: string): Meeting[] {
    return state.meetings
      .filter((meeting) => {
        if (isDate(from) && meeting.date < from) return false;
        if (isDate(to) && meeting.date > to) return false;
        return true;
      })
      .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
  }

  private createMeeting(state: DemoState, draft: MeetingDraft, owner: string): Meeting {
    const meeting: Meeting = {
      id: `meeting-${randomId()}`,
      title: asString(draft?.title, 'Untitled meeting').slice(0, 160),
      date: isDate(draft?.date) ? draft.date : todayKey(),
      start: /^\d{2}:\d{2}$/.test(draft?.start ?? '') ? draft.start : '09:00',
      end: /^\d{2}:\d{2}$/.test(draft?.end ?? '') ? draft.end : '09:30',
      type: MEETING_TYPES.includes(draft?.type as (typeof MEETING_TYPES)[number])
        ? (draft.type as (typeof MEETING_TYPES)[number])
        : 'decision',
      location: asString(draft?.location, 'Virtual'),
      attendees: Array.isArray(draft?.attendees)
        ? draft.attendees.map((person) => person.trim()).filter(Boolean)
        : [],
      owner,
      notes: asString(draft?.notes).slice(0, 4000),
    };
    state.meetings.push(meeting);
    return meeting;
  }

  private removeMeeting(state: DemoState, id: string): boolean {
    const index = state.meetings.findIndex((meeting) => meeting.id === id);
    if (index === -1) throw new DemoHttpError(404, 'Meeting not found.');
    state.meetings.splice(index, 1);
    return true;
  }

  /* ---------------------------------------------------------------- vendors */

  private updateVendor(state: DemoState, id: string, body: unknown): Vendor {
    const patch = (body ?? {}) as {
      status?: unknown;
      progress?: unknown;
      reviewDue?: unknown;
      notes?: unknown;
    };
    const current = state.vendors.find((vendor) => vendor.id === id);
    if (!current) throw new DemoHttpError(404, 'Vendor not found.');
    const next: Vendor = { ...current };
    if (VENDOR_STATUSES.includes(patch.status as VendorStatus)) {
      next.status = patch.status as VendorStatus;
    }
    if (typeof patch.progress === 'number' && Number.isFinite(patch.progress)) {
      next.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
    }
    if (isDate(patch.reviewDue)) next.reviewDue = patch.reviewDue;
    if (typeof patch.notes === 'string') next.notes = patch.notes.slice(0, 6000);
    if (next.status === 'complete') next.progress = 100;
    replaceById(state.vendors, next);
    return next;
  }

  /* ------------------------------------------------------------------ board */

  private updateBoardBrief(state: DemoState, id: string, patch: BoardDraft): BoardBrief {
    const current = state.board.find((brief) => brief.id === id);
    if (!current) throw new DemoHttpError(404, 'Brief not found.');
    const body = typeof patch?.body === 'string' ? patch.body : current.body;
    const next: BoardBrief = {
      ...current,
      title:
        typeof patch?.title === 'string' && patch.title.trim() ? patch.title.trim() : current.title,
      date: isDate(patch?.date) ? patch.date : current.date,
      audience:
        typeof patch?.audience === 'string' && patch.audience.trim()
          ? patch.audience.trim()
          : current.audience,
      status: BOARD_STATUSES.includes(patch?.status as (typeof BOARD_STATUSES)[number])
        ? (patch.status as (typeof BOARD_STATUSES)[number])
        : current.status,
      decisions: Array.isArray(patch?.decisions)
        ? patch.decisions.map((decision) => String(decision).trim()).filter(Boolean)
        : current.decisions,
      body,
      bodyHtml: renderMarkdown(body),
    };
    replaceById(state.board, next);
    return next;
  }

  /* ------------------------------------------------------------- objectives */

  private objectiveHistory(
    state: DemoState,
    days: number,
  ): Array<{ date: string; done: number; total: number }> {
    const points: Array<{ date: string; done: number; total: number }> = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = format(subDays(new Date(), offset), 'yyyy-MM-dd');
      const plan = getPlan(state, date);
      points.push({
        date,
        done: plan.objectives.filter((objective) => objective.done).length,
        total: plan.objectives.length,
      });
    }
    return points;
  }

  /* --------------------------------------------------------------- dashboard */

  private dashboard(state: DemoState, user: UserSummary): DashboardData {
    const day = todayKey();
    const tasks = sortTasks(state.tasks);
    const risks = sortRisks(state.risks);
    const meetings = this.listMeetings(state, day);
    const vendors = sortVendors(state.vendors);
    const boardBriefs = sortBoard(state.board);
    const plan = getPlan(state, day);
    const quotePair = pickInsights(state.insights);
    const week = buildWeek(state, tasks);

    const openRisks = risks.filter((risk) => risk.status !== 'closed');
    const openTasks = tasks.filter((task) => task.status !== 'done');
    const todayDone = tasks.filter(
      (task) => task.status === 'done' && task.completedAt?.slice(0, 10) === day,
    );
    const vendorActions = vendors.filter(
      (vendor) =>
        vendor.status === 'escalated' ||
        (vendor.status !== 'complete' &&
          vendor.reviewDue <= format(addDays(new Date(), 14), 'yyyy-MM-dd')),
    );
    const documented = openRisks.filter((risk) => risk.framework && risk.control).length;
    const evidenceCoverage = openRisks.length
      ? Math.round((documented / openRisks.length) * 100)
      : 100;
    const weekObjectiveAverage = week.length
      ? Math.round(
          (week.reduce(
            (total, point) =>
              total + (point.objectivesTotal ? point.objectivesDone / point.objectivesTotal : 0),
            0,
          ) /
            week.length) *
            100,
        )
      : 0;
    const completedThisWeek = tasks.filter(
      (task) => task.status === 'done' && task.completedAt && task.completedAt >= startOfWeekIso(),
    ).length;
    const createdThisWeek = tasks.filter((task) => task.createdAt >= startOfWeekIso()).length;
    const followThrough = createdThisWeek
      ? Math.round((completedThisWeek / createdThisWeek) * 100)
      : 100;
    const trustScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          evidenceCoverage * 0.35 + Math.min(followThrough, 100) * 0.35 + weekObjectiveAverage * 0.3,
        ),
      ),
    );
    const streak = calculationStreak(state, tasks);
    const overdueRisks = openRisks.filter(
      (risk) => risk.due < day && risk.status !== 'monitoring',
    ).length;
    const overdueTasks = openTasks.filter((task) => task.due < day).length;

    const pulse: DashboardPulse = {
      openItems: openRisks.length,
      criticalItems: openRisks.filter((risk) => risk.severity === 'critical').length,
      overdue: overdueRisks + overdueTasks,
      openTasks: openTasks.length,
      doneToday: todayDone.length,
      objectivesDone: plan.objectives.filter((objective) => objective.done).length,
      objectivesTotal: plan.objectives.length,
      vendorActions: vendorActions.length,
      trustScore,
      evidenceCoverage,
      streak,
    };

    const nextBoard =
      boardBriefs.find((brief) => brief.date >= day) ??
      [...boardBriefs].sort((a, b) => b.date.localeCompare(a.date))[0] ??
      null;

    return {
      generatedAt: new Date().toISOString(),
      user,
      pulse,
      plan,
      focusTasks: openTasks
        .filter(
          (task) =>
            task.due <= format(addDays(new Date(), 2), 'yyyy-MM-dd') ||
            task.priority === 'critical' ||
            task.priority === 'high',
        )
        .slice(0, 5),
      meetings: meetings
        .filter((meeting) => meeting.date >= day)
        .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`))
        .slice(0, 5),
      risks: openRisks.slice(0, 6),
      vendors: vendors.filter((vendor) => vendor.status !== 'complete').slice(0, 5),
      board: nextBoard,
      insight: quotePair.insight,
      quote: quotePair.quote,
      week,
    };
  }
}

/* -------------------------------------------------------------------- helpers */

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asPriority(value: unknown, fallback: Priority = 'medium'): Priority {
  return PRIORITIES.includes(value as Priority) ? (value as Priority) : fallback;
}

function asTaskStatus(value: unknown): TaskStatus | null {
  return ['todo', 'doing', 'blocked', 'done'].includes(value as TaskStatus)
    ? (value as TaskStatus)
    : null;
}

function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

function replaceById<T extends { id: string }>(items: T[], replacement: T): void {
  const index = items.findIndex((item) => item.id === replacement.id);
  if (index !== -1) items[index] = replacement;
}

function nextRef(existing: string[], prefix: string): string {
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const maximum = existing.reduce((max, ref) => {
    const match = pattern.exec(ref);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${year}-${String(maximum + 1).padStart(3, '0')}`;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const status = TASK_ORDER[a.status] - TASK_ORDER[b.status];
    if (status !== 0) return status;
    const due = a.due.localeCompare(b.due);
    if (due !== 0) return due;
    return PRIORITY[a.priority] - PRIORITY[b.priority];
  });
}

function sortRisks(risks: RiskItem[]): RiskItem[] {
  return [...risks].sort((a, b) => {
    const status = RISK_ORDER[a.status] - RISK_ORDER[b.status];
    if (status !== 0) return status;
    const severity = PRIORITY[a.severity] - PRIORITY[b.severity];
    if (severity !== 0) return severity;
    return a.due.localeCompare(b.due);
  });
}

function sortVendors(vendors: Vendor[]): Vendor[] {
  return [...vendors].sort((a, b) => {
    const tier = a.tier - b.tier;
    if (tier !== 0) return tier;
    const priority = PRIORITY[a.riskRating] - PRIORITY[b.riskRating];
    if (priority !== 0) return priority;
    return a.reviewDue.localeCompare(b.reviewDue);
  });
}

function sortBoard(briefs: BoardBrief[]): BoardBrief[] {
  return [...briefs].sort((a, b) => a.date.localeCompare(b.date));
}

function getPlan(state: DemoState, date: string): DailyPlan {
  if (!isDate(date)) return normalizePlan(todayKey(), null);
  const stored = state.objectives.find((plan) => plan.date === date) ?? null;
  return normalizePlan(date, stored);
}

function normalizePlan(date: string, plan: Partial<DailyPlan> | null): DailyPlan {
  const objectives = Array.isArray(plan?.objectives)
    ? plan.objectives.filter(
        (objective): objective is Objective => Boolean(objective && typeof objective.id === 'string'),
      )
    : [];
  const done = objectives.filter((objective) => objective.done).length;
  return {
    date,
    intent: plan?.intent ?? '',
    objectives,
    completion: objectives.length ? Math.round((done / objectives.length) * 100) : 0,
  };
}

function savePlan(state: DemoState, plan: DailyPlan): void {
  const index = state.objectives.findIndex((item) => item.date === plan.date);
  if (index === -1) {
    state.objectives.push(plan);
  } else {
    state.objectives[index] = plan;
  }
}

function setPlanIntent(state: DemoState, date: string, intent: string): DailyPlan {
  const plan = getPlan(state, date);
  const next = { ...plan, intent: intent.trim().slice(0, 280) };
  savePlan(state, next);
  return next;
}

function addObjective(state: DemoState, date: string, draft: ObjectiveDraft): DailyPlan {
  const plan = getPlan(state, date);
  const objective: Objective = {
    id: `obj-${randomId()}`,
    text: asString(draft?.text, 'New objective').slice(0, 220),
    category: OBJECTIVE_CATEGORIES.includes(draft?.category as ObjectiveCategory)
      ? (draft.category as ObjectiveCategory)
      : 'execution',
    done: false,
  };
  const next = normalizePlan(date, { ...plan, objectives: [...plan.objectives, objective] });
  savePlan(state, next);
  return next;
}

function updateObjective(
  state: DemoState,
  date: string,
  id: string,
  patch: Partial<Objective>,
): DailyPlan {
  const plan = getPlan(state, date);
  const objectives = plan.objectives.map((objective) => {
    if (objective.id !== id) return objective;
    return {
      ...objective,
      done: typeof patch?.done === 'boolean' ? patch.done : objective.done,
      text:
        typeof patch?.text === 'string' && patch.text.trim()
          ? patch.text.trim().slice(0, 220)
          : objective.text,
      category: OBJECTIVE_CATEGORIES.includes(patch?.category as ObjectiveCategory)
        ? (patch.category as ObjectiveCategory)
        : objective.category,
    };
  });
  const next = normalizePlan(date, { ...plan, objectives });
  savePlan(state, next);
  return next;
}

function removeObjective(state: DemoState, date: string, id: string): DailyPlan {
  const plan = getPlan(state, date);
  const next = normalizePlan(date, {
    ...plan,
    objectives: plan.objectives.filter((objective) => objective.id !== id),
  });
  savePlan(state, next);
  return next;
}

function pickInsights(insights: Insight[]): { insight: Insight; quote: Insight } {
  const questions = insights.filter((item) => item.kind === 'question');
  const quotes = insights.filter((item) => item.kind === 'quote');
  const seed = differenceInCalendarDays(new Date(), new Date(2026, 0, 1));
  return {
    insight: questions.length ? questions[Math.abs(seed) % questions.length] : FALLBACK_INSIGHT,
    quote: quotes.length ? quotes[Math.abs(seed * 3 + 1) % quotes.length] : FALLBACK_QUOTE,
  };
}

const FALLBACK_INSIGHT: Insight = {
  id: 'fallback-question',
  kind: 'question',
  text: 'If this control failed tomorrow, how would we know before a customer did?',
  category: 'Ask a risk owner',
  audience: 'risk-owner',
};

const FALLBACK_QUOTE: Insight = {
  id: 'fallback-quote',
  kind: 'quote',
  text: 'Trust is the real currency in governance, risk, and compliance.',
  category: 'Strong GRC',
  attribution: 'Cyber Explainer',
};

function buildWeek(state: DemoState, tasks: Task[]): WeekPoint[] {
  const beginning = startOfWeek(new Date(), { weekStartsOn: 1 });
  const points: WeekPoint[] = [];
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(beginning, index);
    const key = format(date, 'yyyy-MM-dd');
    const plan = getPlan(state, key);
    points.push({
      date: key,
      label: format(date, 'EEE'),
      tasksDone: tasks.filter(
        (task) => task.status === 'done' && task.completedAt?.slice(0, 10) === key,
      ).length,
      objectivesDone: plan.objectives.filter((objective) => objective.done).length,
      objectivesTotal: plan.objectives.length,
    });
  }
  return points;
}

function calculationStreak(state: DemoState, tasks: Task[]): number {
  let streak = 0;
  for (let offset = 0; offset < 60; offset += 1) {
    const date = format(subDays(new Date(), offset), 'yyyy-MM-dd');
    const plan = getPlan(state, date);
    const objectiveDone = plan.objectives.some((objective) => objective.done);
    const taskDone = tasks.some(
      (task) => task.status === 'done' && task.completedAt?.slice(0, 10) === date,
    );
    if (!objectiveDone && !taskDone) break;
    streak += 1;
  }
  return streak;
}

function startOfWeekIso(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

/* ------------------------------------------------------------- date shifting */

/**
 * The JSON snapshot is generated at build time. Shift every dated field so a
 * demo deployed months ago still opens on "today" when a visitor arrives.
 */
function shiftState(state: DemoState, days: number): DemoState {
  const next: DemoState = {
    ...state,
    baseDate: todayKey(),
    tasks: state.tasks.map((task) => ({
      ...task,
      due: shiftDay(task.due, days),
      createdAt: shiftIso(task.createdAt, days),
      updatedAt: shiftIso(task.updatedAt, days),
      completedAt: shiftIso(task.completedAt, days),
    })),
    risks: state.risks.map((risk) => ({
      ...risk,
      due: shiftDay(risk.due, days),
      createdAt: shiftIso(risk.createdAt, days),
      updatedAt: shiftIso(risk.updatedAt, days),
    })),
    meetings: state.meetings.map((meeting) => ({
      ...meeting,
      date: shiftDay(meeting.date, days),
    })),
    vendors: state.vendors.map((vendor) => ({
      ...vendor,
      reviewDue: shiftDay(vendor.reviewDue, days),
      lastReview: shiftDay(vendor.lastReview, days),
    })),
    board: state.board.map((brief) => ({
      ...brief,
      date: shiftDay(brief.date, days),
    })),
    objectives: state.objectives.map((plan) => ({
      ...plan,
      date: shiftDay(plan.date, days),
    })),
  };
  return next;
}

function shiftDay(value: string, days: number): string {
  if (!value || days === 0) return value;
  return format(addDays(parseISO(value), days), 'yyyy-MM-dd');
}

function shiftIso(value: string, days: number): string;
function shiftIso(value: string | undefined, days: number): string | undefined;
function shiftIso(value: string | undefined, days: number): string | undefined {
  if (!value || days === 0) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return addDays(parsed, days).toISOString();
}
