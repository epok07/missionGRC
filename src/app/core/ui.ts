import type {
  BoardStatus,
  Insight,
  MeetingType,
  ObjectiveCategory,
  Priority,
  RiskStatus,
  RiskType,
  TaskStatus,
  VendorStatus,
  Workstream,
} from '../../shared/models';

export type Tone = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'azure' | 'indigo' | 'purple' | 'secondary';

export function priorityTone(priority: Priority): Tone {
  return ({ critical: 'red', high: 'orange', medium: 'yellow', low: 'teal' } satisfies Record<Priority, Tone>)[priority];
}

export function priorityLabel(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function taskStatusTone(status: TaskStatus): Tone {
  return ({ todo: 'secondary', doing: 'azure', blocked: 'red', done: 'green' } satisfies Record<TaskStatus, Tone>)[status];
}

export function taskStatusLabel(status: TaskStatus): string {
  return { todo: 'To do', doing: 'In progress', blocked: 'Blocked', done: 'Done' }[status];
}

export function riskStatusTone(status: RiskStatus): Tone {
  return ({ open: 'orange', 'in-progress': 'azure', monitoring: 'yellow', closed: 'green' } satisfies Record<RiskStatus, Tone>)[status];
}

export function riskStatusLabel(status: RiskStatus): string {
  return {
    open: 'Open',
    'in-progress': 'In progress',
    monitoring: 'Monitoring',
    closed: 'Closed',
  }[status];
}

export function riskTypeLabel(type: RiskType): string {
  return { risk: 'Risk', issue: 'Issue', decision: 'Decision', action: 'Action' }[type];
}

export function riskTypeIcon(type: RiskType): string {
  return {
    risk: 'ti-alert-triangle',
    issue: 'ti-bug',
    decision: 'ti-scale',
    action: 'ti-checkbox',
  }[type];
}

export function vendorStatusTone(status: VendorStatus): Tone {
  return ({
    'not-started': 'secondary',
    'in-review': 'azure',
    'awaiting-vendor': 'yellow',
    complete: 'green',
    escalated: 'red',
  } satisfies Record<VendorStatus, Tone>)[status];
}

export function vendorStatusLabel(status: VendorStatus): string {
  return {
    'not-started': 'Not started',
    'in-review': 'In review',
    'awaiting-vendor': 'Awaiting vendor',
    complete: 'Complete',
    escalated: 'Escalated',
  }[status];
}

export function boardStatusTone(status: BoardStatus): Tone {
  return ({ drafting: 'yellow', 'in-review': 'azure', final: 'green' } satisfies Record<BoardStatus, Tone>)[status];
}

export function workstreamMeta(workstream: Workstream): { label: string; icon: string; tone: Tone } {
  return ({
    triage: { label: 'Triage', icon: 'ti-inbox', tone: 'secondary' },
    decision: { label: 'Decision room', icon: 'ti-scale', tone: 'indigo' },
    evidence: { label: 'Evidence', icon: 'ti-folder-check', tone: 'teal' },
    tprm: { label: 'Third-party risk', icon: 'ti-building-bank', tone: 'orange' },
    board: { label: 'Board & steering', icon: 'ti-presentation', tone: 'purple' },
    audit: { label: 'Audit', icon: 'ti-clipboard-check', tone: 'azure' },
    relationship: { label: 'Relationship', icon: 'ti-users', tone: 'green' },
  } satisfies Record<Workstream, { label: string; icon: string; tone: Tone }>)[workstream];
}

export function meetingTypeMeta(type: MeetingType): { label: string; icon: string; tone: Tone } {
  return ({
    decision: { label: 'Decision', icon: 'ti-scale', tone: 'indigo' },
    vendor: { label: 'Vendor', icon: 'ti-building-bank', tone: 'orange' },
    audit: { label: 'Audit', icon: 'ti-clipboard-check', tone: 'azure' },
    board: { label: 'Board', icon: 'ti-presentation', tone: 'purple' },
    'one-on-one': { label: '1:1', icon: 'ti-users', tone: 'green' },
    focus: { label: 'Focus', icon: 'ti-target-arrow', tone: 'teal' },
  } satisfies Record<MeetingType, { label: string; icon: string; tone: Tone }>)[type];
}

export function objectiveCategoryMeta(category: ObjectiveCategory): {
  label: string;
  icon: string;
  tone: Tone;
} {
  return ({
    judgment: { label: 'Judgment', icon: 'ti-scale', tone: 'indigo' },
    execution: { label: 'Execution', icon: 'ti-checklist', tone: 'azure' },
    influence: { label: 'Influence', icon: 'ti-speakerphone', tone: 'purple' },
    evidence: { label: 'Evidence', icon: 'ti-folder-check', tone: 'teal' },
    relationship: { label: 'Relationship', icon: 'ti-heart-handshake', tone: 'green' },
  } satisfies Record<ObjectiveCategory, { label: string; icon: string; tone: Tone }>)[category];
}

export function insightAudienceLabel(audience: Insight['audience']): string {
  return {
    'risk-owner': 'For a risk owner',
    leadership: 'For leadership',
    self: 'For yourself',
  }[audience ?? 'self'];
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done'];
export const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
export const RISK_STATUSES: RiskStatus[] = ['open', 'in-progress', 'monitoring', 'closed'];
export const RISK_TYPES: RiskType[] = ['risk', 'issue', 'decision', 'action'];
export const WORKSTREAMS: Workstream[] = [
  'triage',
  'decision',
  'evidence',
  'tprm',
  'board',
  'audit',
  'relationship',
];
export const OBJECTIVE_CATEGORIES: ObjectiveCategory[] = [
  'judgment',
  'execution',
  'influence',
  'evidence',
  'relationship',
];
export const MEETING_TYPES: MeetingType[] = [
  'decision',
  'vendor',
  'audit',
  'board',
  'one-on-one',
  'focus',
];

export function dueLabel(date: string, todayKey = new Date().toISOString().slice(0, 10)): string {
  if (!date) return 'No date';
  const target = new Date(`${date}T12:00:00`);
  const today = new Date(`${todayKey}T12:00:00`);
  const difference = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  if (difference === -1) return 'Yesterday';
  if (difference < -1) return `${Math.abs(difference)} days late`;
  if (difference <= 7) return `In ${difference} days`;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
  }).format(target);
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en', options).format(new Date(`${date}T12:00:00`));
}

export function formatTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function dateKey(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function greeting(value: Date = new Date()): string {
  const hour = value.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
