/**
 * Domain types shared by the Angular client and the Express data API.
 * Keep this file free of browser- and Node-specific imports.
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type Workstream =
  | 'triage'
  | 'decision'
  | 'evidence'
  | 'tprm'
  | 'board'
  | 'audit'
  | 'relationship';

export type RiskType = 'risk' | 'issue' | 'decision' | 'action';
export type RiskStatus = 'open' | 'in-progress' | 'monitoring' | 'closed';
export type VendorStatus =
  | 'not-started'
  | 'in-review'
  | 'awaiting-vendor'
  | 'complete'
  | 'escalated';
export type BoardStatus = 'drafting' | 'in-review' | 'final';
export type MeetingType = 'decision' | 'vendor' | 'audit' | 'board' | 'one-on-one' | 'focus';
export type ObjectiveCategory = 'judgment' | 'execution' | 'influence' | 'evidence' | 'relationship';
export type InsightKind = 'quote' | 'question';

export interface UserSummary {
  username: string;
  name: string;
  role: string;
  initials: string;
  focus: string;
}

export interface Task {
  id: string;
  ref: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
  owner: string;
  workstream: Workstream;
  riskRef?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RiskItem {
  id: string;
  ref: string;
  title: string;
  type: RiskType;
  status: RiskStatus;
  severity: Priority;
  owner: string;
  businessUnit: string;
  due: string;
  framework: string;
  control: string;
  exposure: string;
  decisionNeeded: boolean;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  type: MeetingType;
  location: string;
  attendees: string[];
  owner: string;
  notes: string;
}

export interface Vendor {
  id: string;
  ref: string;
  vendor: string;
  service: string;
  tier: 1 | 2 | 3;
  riskRating: Priority;
  status: VendorStatus;
  reviewDue: string;
  lastReview: string;
  owner: string;
  dataClass: 'Restricted' | 'Confidential' | 'Internal' | 'Public';
  progress: number;
  framework: string;
  concerns: string[];
  notes: string;
}

export interface BoardBrief {
  id: string;
  ref: string;
  title: string;
  date: string;
  audience: string;
  status: BoardStatus;
  owner: string;
  decisions: string[];
  body: string;
  bodyHtml: string;
}

export interface Objective {
  id: string;
  text: string;
  category: ObjectiveCategory;
  done: boolean;
}

export interface DailyPlan {
  date: string;
  intent: string;
  objectives: Objective[];
  completion: number;
}

export interface Insight {
  id: string;
  kind: InsightKind;
  text: string;
  category: string;
  audience?: 'risk-owner' | 'leadership' | 'self';
  source?: string;
  timestamp?: string;
  attribution?: string;
}

export interface WeekPoint {
  date: string;
  label: string;
  tasksDone: number;
  objectivesDone: number;
  objectivesTotal: number;
}

export interface DashboardPulse {
  openItems: number;
  criticalItems: number;
  overdue: number;
  openTasks: number;
  doneToday: number;
  objectivesDone: number;
  objectivesTotal: number;
  vendorActions: number;
  trustScore: number;
  evidenceCoverage: number;
  streak: number;
}

export interface DashboardData {
  generatedAt: string;
  user: UserSummary;
  pulse: DashboardPulse;
  plan: DailyPlan;
  focusTasks: Task[];
  meetings: Meeting[];
  risks: RiskItem[];
  vendors: Vendor[];
  board: BoardBrief | null;
  insight: Insight;
  quote: Insight;
  week: WeekPoint[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserSummary;
}

export interface TaskDraft {
  title: string;
  notes?: string;
  priority?: Priority;
  due?: string;
  workstream?: Workstream;
  riskRef?: string;
}

export interface MeetingDraft {
  title: string;
  date: string;
  start: string;
  end: string;
  type?: MeetingType;
  location?: string;
  attendees?: string[];
  notes?: string;
}

export interface ObjectiveDraft {
  text: string;
  category?: ObjectiveCategory;
}

export interface RiskDraft {
  title: string;
  type?: RiskType;
  severity?: Priority;
  owner?: string;
  businessUnit?: string;
  due?: string;
  framework?: string;
  control?: string;
  exposure?: string;
  decisionNeeded?: boolean;
  notes?: string;
}

export interface BoardDraft {
  title?: string;
  date?: string;
  audience?: string;
  status?: BoardStatus;
  decisions?: string[];
  body?: string;
}

export interface ApiError {
  error: string;
}
