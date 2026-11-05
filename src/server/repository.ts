import { randomUUID } from 'node:crypto';
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfWeek,
  subDays,
} from 'date-fns';
import type {
  BoardBrief,
  BoardDraft,
  BoardStatus,
  DailyPlan,
  DashboardData,
  DashboardPulse,
  Insight,
  Meeting,
  MeetingDraft,
  MeetingType,
  Objective,
  ObjectiveCategory,
  ObjectiveDraft,
  Priority,
  RiskDraft,
  RiskItem,
  RiskStatus,
  RiskType,
  Task,
  TaskDraft,
  TaskStatus,
  UserSummary,
  Vendor,
  VendorStatus,
  WeekPoint,
  Workstream,
} from '../shared/models';
import {
  deleteRecord,
  listRecords,
  readRecord,
  renderMarkdown,
  writeRecord,
} from './storage';

type StoredTask = Omit<Task, 'notes'>;
type StoredRisk = Omit<RiskItem, 'notes'>;
type StoredMeeting = Omit<Meeting, 'notes'>;
type StoredVendor = Omit<Vendor, 'notes'>;
type StoredBoard = Omit<BoardBrief, 'body' | 'bodyHtml'>;
type StoredPlan = Omit<DailyPlan, 'completion'> & { id: string };

const PRIORITY: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const TASK_ORDER: Record<TaskStatus, number> = { doing: 0, todo: 1, blocked: 2, done: 3 };
const RISK_ORDER: Record<RiskStatus, number> = {
  open: 0,
  'in-progress': 1,
  monitoring: 2,
  closed: 3,
};

const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done'];
const RISK_STATUSES: RiskStatus[] = ['open', 'in-progress', 'monitoring', 'closed'];
const RISK_TYPES: RiskType[] = ['risk', 'issue', 'decision', 'action'];
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
const WORKSTREAMS: Workstream[] = [
  'triage',
  'decision',
  'evidence',
  'tprm',
  'board',
  'audit',
  'relationship',
];
const VENDOR_STATUSES: VendorStatus[] = [
  'not-started',
  'in-review',
  'awaiting-vendor',
  'complete',
  'escalated',
];
const BOARD_STATUSES: BoardStatus[] = ['drafting', 'in-review', 'final'];
const MEETING_TYPES: MeetingType[] = [
  'decision',
  'vendor',
  'audit',
  'board',
  'one-on-one',
  'focus',
];
const OBJECTIVE_CATEGORIES: ObjectiveCategory[] = [
  'judgment',
  'execution',
  'influence',
  'evidence',
  'relationship',
];

function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function isoNow(): string {
  return new Date().toISOString();
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
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : null;
}

function asRiskStatus(value: unknown): RiskStatus | null {
  return RISK_STATUSES.includes(value as RiskStatus) ? (value as RiskStatus) : null;
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

function nextRef(existing: string[], prefix: string): string {
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const maximum = existing.reduce((max, ref) => {
    const match = pattern.exec(ref);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${year}-${String(maximum + 1).padStart(3, '0')}`;
}

/* ------------------------------------------------------------------ tasks */

export async function listTasks(): Promise<Task[]> {
  const records = await listRecords<StoredTask>('tasks');
  return sortTasks(
    records.map(({ body, ...task }) => ({
      ...task,
      notes: body,
    })),
  );
}

export async function createTask(draft: TaskDraft, owner: string): Promise<Task> {
  const existing = await listRecords<StoredTask>('tasks');
  const now = isoNow();
  const task: Task = {
    id: `task-${randomUUID().slice(0, 8)}`,
    ref: nextRef(
      existing.map((item) => item.ref),
      'TSK',
    ),
    title: asString(draft.title, 'Untitled task').slice(0, 160),
    notes: asString(draft.notes).slice(0, 4000),
    status: 'todo',
    priority: asPriority(draft.priority),
    due: isDate(draft.due) ? draft.due : today(),
    owner,
    workstream: WORKSTREAMS.includes(draft.workstream as Workstream)
      ? (draft.workstream as Workstream)
      : 'triage',
    riskRef: asString(draft.riskRef) || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await writeRecord('tasks', omitBody(task), task.notes);
  return task;
}

export async function updateTask(
  id: string,
  patch: Partial<TaskDraft> & { status?: TaskStatus },
): Promise<Task | null> {
  const stored = await readRecord<StoredTask>('tasks', id);
  if (!stored) return null;
  const { body, ...current } = stored;
  const next: Task = { ...current, notes: body, updatedAt: isoNow() };

  if (typeof patch.title === 'string' && patch.title.trim()) next.title = patch.title.trim();
  if (typeof patch.notes === 'string') next.notes = patch.notes.slice(0, 4000);
  if (isDate(patch.due)) next.due = patch.due;
  if (patch.priority && PRIORITIES.includes(patch.priority)) next.priority = patch.priority;
  if (patch.workstream && WORKSTREAMS.includes(patch.workstream)) next.workstream = patch.workstream;
  if (typeof patch.riskRef === 'string') next.riskRef = patch.riskRef.trim() || undefined;

  const status = asTaskStatus(patch.status);
  if (status) {
    next.status = status;
    if (status === 'done' && current.status !== 'done') next.completedAt = isoNow();
    if (status !== 'done') delete next.completedAt;
  }

  await writeRecord('tasks', omitBody(next), next.notes);
  return next;
}

export async function removeTask(id: string): Promise<boolean> {
  return deleteRecord('tasks', id);
}

/* ------------------------------------------------------------------ risks */

export async function listRisks(): Promise<RiskItem[]> {
  const records = await listRecords<StoredRisk>('risks');
  return sortRisks(
    records.map(({ body, ...risk }) => ({
      ...risk,
      notes: body,
    })),
  );
}

export async function createRisk(draft: RiskDraft, owner: string): Promise<RiskItem> {
  const existing = await listRecords<StoredRisk>('risks');
  const type: RiskType = RISK_TYPES.includes(draft.type as RiskType)
    ? (draft.type as RiskType)
    : 'risk';
  const prefix = { risk: 'RSK', issue: 'ISS', decision: 'DEC', action: 'ACT' }[type];
  const now = isoNow();
  const risk: RiskItem = {
    id: `item-${randomUUID().slice(0, 8)}`,
    ref: nextRef(
      existing.map((item) => item.ref),
      prefix,
    ),
    title: asString(draft.title, 'Untitled open item').slice(0, 180),
    type,
    status: 'open',
    severity: asPriority(draft.severity),
    owner: asString(draft.owner, owner) || owner,
    businessUnit: asString(draft.businessUnit, 'Enterprise'),
    due: isDate(draft.due) ? draft.due : format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    framework: asString(draft.framework, 'ISO 27001'),
    control: asString(draft.control, 'To be mapped'),
    exposure: asString(draft.exposure, 'Not yet quantified'),
    decisionNeeded: Boolean(draft.decisionNeeded),
    createdAt: now,
    updatedAt: now,
    notes: asString(draft.notes).slice(0, 6000),
  };
  await writeRecord('risks', omitBody(risk), risk.notes);
  return risk;
}

export async function updateRisk(
  id: string,
  patch: { status?: RiskStatus; owner?: string; due?: string; notes?: string },
): Promise<RiskItem | null> {
  const stored = await readRecord<StoredRisk>('risks', id);
  if (!stored) return null;
  const { body, ...current } = stored;
  const next: RiskItem = { ...current, notes: body, updatedAt: isoNow() };
  const status = asRiskStatus(patch.status);
  if (status) next.status = status;
  if (typeof patch.owner === 'string' && patch.owner.trim()) next.owner = patch.owner.trim();
  if (isDate(patch.due)) next.due = patch.due;
  if (typeof patch.notes === 'string') next.notes = patch.notes.slice(0, 6000);
  await writeRecord('risks', omitBody(next), next.notes);
  return next;
}

/* --------------------------------------------------------------- meetings */

export async function listMeetings(from?: string, to?: string): Promise<Meeting[]> {
  const records = await listRecords<StoredMeeting>('meetings');
  return records
    .map(({ body, ...meeting }) => ({ ...meeting, notes: body }))
    .filter((meeting) => {
      if (isDate(from) && meeting.date < from) return false;
      if (isDate(to) && meeting.date > to) return false;
      return true;
    })
    .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
}

export async function createMeeting(draft: MeetingDraft, owner: string): Promise<Meeting> {
  const meet: Meeting = {
    id: `meeting-${randomUUID().slice(0, 8)}`,
    title: asString(draft.title, 'Untitled meeting').slice(0, 160),
    date: isDate(draft.date) ? draft.date : today(),
    start: /^\d{2}:\d{2}$/.test(draft.start) ? draft.start : '09:00',
    end: /^\d{2}:\d{2}$/.test(draft.end) ? draft.end : '09:30',
    type: MEETING_TYPES.includes(draft.type as MeetingType)
      ? (draft.type as MeetingType)
      : 'decision',
    location: asString(draft.location, 'Virtual'),
    attendees: Array.isArray(draft.attendees)
      ? draft.attendees.map((person) => person.trim()).filter(Boolean)
      : [],
    owner,
    notes: asString(draft.notes).slice(0, 4000),
  };
  await writeRecord('meetings', omitBody(meet), meet.notes);
  return meet;
}

export async function removeMeeting(id: string): Promise<boolean> {
  return deleteRecord('meetings', id);
}

/* ---------------------------------------------------------------- vendors */

export async function listVendors(): Promise<Vendor[]> {
  const records = await listRecords<StoredVendor>('vendors');
  return records
    .map(({ body, ...vendor }) => ({ ...vendor, notes: body }))
    .sort((a, b) => {
      const tier = a.tier - b.tier;
      if (tier !== 0) return tier;
      const priority = PRIORITY[a.riskRating] - PRIORITY[b.riskRating];
      if (priority !== 0) return priority;
      return a.reviewDue.localeCompare(b.reviewDue);
    });
}

export async function updateVendor(
  id: string,
  patch: { status?: VendorStatus; progress?: number; reviewDue?: string; notes?: string },
): Promise<Vendor | null> {
  const stored = await readRecord<StoredVendor>('vendors', id);
  if (!stored) return null;
  const { body, ...current } = stored;
  const next: Vendor = { ...current, notes: body };
  if (VENDOR_STATUSES.includes(patch.status as VendorStatus)) {
    next.status = patch.status as VendorStatus;
  }
  if (typeof patch.progress === 'number' && Number.isFinite(patch.progress)) {
    next.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
  }
  if (isDate(patch.reviewDue)) next.reviewDue = patch.reviewDue;
  if (typeof patch.notes === 'string') next.notes = patch.notes.slice(0, 6000);
  if (next.status === 'complete') next.progress = 100;
  await writeRecord('vendors', omitBody(next), next.notes);
  return next;
}

/* ------------------------------------------------------------------ board */

export async function listBoardBriefs(): Promise<BoardBrief[]> {
  const records = await listRecords<StoredBoard>('board');
  return records
    .map(({ body, ...brief }) => ({
      ...brief,
      body,
      bodyHtml: renderMarkdown(body),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function updateBoardBrief(
  id: string,
  patch: BoardDraft,
): Promise<BoardBrief | null> {
  const stored = await readRecord<StoredBoard>('board', id);
  if (!stored) return null;
  const { body, ...current } = stored;
  const next: StoredBoard = {
    ...current,
    title: typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim() : current.title,
    date: isDate(patch.date) ? patch.date : current.date,
    audience:
      typeof patch.audience === 'string' && patch.audience.trim()
        ? patch.audience.trim()
        : current.audience,
    status: BOARD_STATUSES.includes(patch.status as BoardStatus)
      ? (patch.status as BoardStatus)
      : current.status,
    decisions: Array.isArray(patch.decisions)
      ? patch.decisions.map((decision) => String(decision).trim()).filter(Boolean)
      : current.decisions,
  };
  const nextBody = typeof patch.body === 'string' ? patch.body : body;
  await writeRecord('board', next, nextBody);
  return {
    ...next,
    body: nextBody,
    bodyHtml: renderMarkdown(nextBody),
  };
}

/* ------------------------------------------------------------- objectives */

function normalizePlan(date: string, plan: Partial<DailyPlan> | null): DailyPlan {
  const objectives = Array.isArray(plan?.objectives)
    ? plan.objectives.filter((objective): objective is Objective =>
        Boolean(objective && typeof objective.id === 'string'),
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

export async function getPlan(date = today()): Promise<DailyPlan> {
  if (!isDate(date)) return normalizePlan(today(), null);
  const stored = await readRecord<StoredPlan>('objectives', date);
  return normalizePlan(date, stored);
}

export async function setPlanIntent(date: string, intent: string): Promise<DailyPlan> {
  const plan = await getPlan(date);
  const next = { ...plan, intent: intent.trim().slice(0, 280) };
  await savePlan(next);
  return next;
}

export async function addObjective(date: string, draft: ObjectiveDraft): Promise<DailyPlan> {
  const plan = await getPlan(date);
  const objective: Objective = {
    id: `obj-${randomUUID().slice(0, 8)}`,
    text: asString(draft.text, 'New objective').slice(0, 220),
    category: OBJECTIVE_CATEGORIES.includes(draft.category as ObjectiveCategory)
      ? (draft.category as ObjectiveCategory)
      : 'execution',
    done: false,
  };
  const next = normalizePlan(date, {
    ...plan,
    objectives: [...plan.objectives, objective],
  });
  await savePlan(next);
  return next;
}

export async function updateObjective(
  date: string,
  id: string,
  patch: { done?: boolean; text?: string; category?: ObjectiveCategory },
): Promise<DailyPlan> {
  const plan = await getPlan(date);
  const objectives = plan.objectives.map((objective) => {
    if (objective.id !== id) return objective;
    return {
      ...objective,
      done: typeof patch.done === 'boolean' ? patch.done : objective.done,
      text:
        typeof patch.text === 'string' && patch.text.trim()
          ? patch.text.trim().slice(0, 220)
          : objective.text,
      category: OBJECTIVE_CATEGORIES.includes(patch.category as ObjectiveCategory)
        ? (patch.category as ObjectiveCategory)
        : objective.category,
    };
  });
  const next = normalizePlan(date, { ...plan, objectives });
  await savePlan(next);
  return next;
}

export async function removeObjective(date: string, id: string): Promise<DailyPlan> {
  const plan = await getPlan(date);
  const next = normalizePlan(date, {
    ...plan,
    objectives: plan.objectives.filter((objective) => objective.id !== id),
  });
  await savePlan(next);
  return next;
}

async function savePlan(plan: DailyPlan): Promise<void> {
  const { completion: _completion, ...stored } = plan;
  await writeRecord('objectives', { ...stored, id: plan.date });
}

export async function getObjectiveHistory(days = 14): Promise<
  Array<{ date: string; done: number; total: number }>
> {
  const points: Array<{ date: string; done: number; total: number }> = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = format(subDays(new Date(), offset), 'yyyy-MM-dd');
    const plan = await getPlan(date);
    points.push({
      date,
      done: plan.objectives.filter((objective) => objective.done).length,
      total: plan.objectives.length,
    });
  }
  return points;
}

/* ---------------------------------------------------------------- insights */

export async function listInsights(): Promise<Insight[]> {
  const records = await listRecords<Omit<Insight, 'text'>>('insights');
  return records.map(({ body, ...insight }) => ({ ...insight, text: body }));
}

export async function pickInsights(): Promise<{ insight: Insight; quote: Insight }> {
  const insights = await listInsights();
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

/* --------------------------------------------------------------- dashboard */

export async function getDashboard(user: UserSummary): Promise<DashboardData> {
  const day = today();
  const [tasks, risks, meetings, vendors, boardBriefs, plan, quotePair] = await Promise.all([
    listTasks(),
    listRisks(),
    listMeetings(day),
    listVendors(),
    listBoardBriefs(),
    getPlan(day),
    pickInsights(),
  ]);
  const week = await buildWeek(tasks);

  const openRisks = risks.filter((risk) => risk.status !== 'closed');
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const todayDone = tasks.filter(
    (task) => task.status === 'done' && task.completedAt?.slice(0, 10) === day,
  );
  const vendorActions = vendors.filter(
    (vendor) =>
      vendor.status === 'escalated' ||
      (vendor.status !== 'complete' && vendor.reviewDue <= format(addDays(new Date(), 14), 'yyyy-MM-dd')),
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
      Math.round(evidenceCoverage * 0.35 + Math.min(followThrough, 100) * 0.35 + weekObjectiveAverage * 0.3),
    ),
  );
  const streak = await calculationStreak();
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
    generatedAt: isoNow(),
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

// The dashboard needs completed task timestamps for weekly points.
async function buildWeek(tasks: Task[]): Promise<WeekPoint[]> {
  const beginning = startOfWeek(new Date(), { weekStartsOn: 1 });
  const points: WeekPoint[] = [];
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(beginning, index);
    const key = format(date, 'yyyy-MM-dd');
    const plan = await getPlan(key);
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

async function calculationStreak(): Promise<number> {
  const tasks = await listTasks();
  let streak = 0;
  for (let offset = 0; offset < 60; offset += 1) {
    const date = format(subDays(new Date(), offset), 'yyyy-MM-dd');
    const plan = await getPlan(date);
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

function omitBody<T extends object>(record: T): T {
  const { body: _body, ...rest } = record as T & { body?: string };
  return rest as T;
}

export { renderMarkdown };
