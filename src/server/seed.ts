import { promises as fs } from 'node:fs';
import { addDays, format } from 'date-fns';
import type {
  BoardBrief,
  Insight,
  Meeting,
  Objective,
  RiskItem,
  Task,
  Vendor,
} from '../shared/models';
import { dataDir, ensureDataDirectory, replaceFile, writeRecord } from './storage';

const now = new Date();

function date(offset: number): string {
  return format(addDays(now, offset), 'yyyy-MM-dd');
}

function stamp(dayOffset: number, time = '09:00'): string {
  return new Date(`${date(dayOffset)}T${time}:00`).toISOString();
}

function task(
  ref: string,
  title: string,
  status: Task['status'],
  priority: Task['priority'],
  dueOffset: number,
  workstream: Task['workstream'],
  notes: string,
  options: {
    riskRef?: string;
    createdAtOffset?: number;
    completedOffset?: number;
    owner?: string;
  } = {},
): Task {
  return {
    id: `task-${ref.toLowerCase()}`,
    ref: `TSK-2026-${ref}`,
    title,
    status,
    priority,
    due: date(dueOffset),
    owner: options.owner ?? 'Ki',
    workstream,
    riskRef: options.riskRef,
    notes,
    createdAt: stamp(options.createdAtOffset ?? -8),
    updatedAt: stamp(options.completedOffset ?? 0, '16:10'),
    completedAt:
      options.completedOffset !== undefined ? stamp(options.completedOffset, '16:10') : undefined,
  };
}

const tasks: Task[] = [
  task(
    '001',
    'Morning triage: separate noise from real risk',
    'done',
    'high',
    0,
    'triage',
    'Inbox: 34 messages. Two genuine decisions, one vendor escalation, the rest is noise. Kept the decision room at 10:30.',
    { completedOffset: 0 },
  ),
  task(
    '002',
    'Prepare decision brief: CRM migration compensating control',
    'doing',
    'critical',
    0,
    'decision',
    'Frame the choice as speed versus evidence. Name the owner, the accepted exposure, and the exit gate.',
    { riskRef: 'DEC-2026-007' },
  ),
  task(
    '003',
    'Chase Northwind SOC 2 Type II evidence',
    'todo',
    'high',
    0,
    'tprm',
    'Request the bridge letter and the subprocessor list. Confirm the renewal date before the vendor call.',
    { riskRef: 'RSK-2026-014' },
  ),
  task(
    '004',
    'Walk IT Ops through overdue privileged access review',
    'done',
    'high',
    0,
    'evidence',
    'Agreed a 48-hour remediation window for the three elevated contractor accounts. Evidence captured in the ticket.',
    { riskRef: 'RSK-2026-018', completedOffset: 0 },
  ),
  task(
    '005',
    'Update control narrative A.5.19 for vendor access',
    'todo',
    'medium',
    1,
    'evidence',
    'Add the new evidence source and the review cadence. If it cannot be tested, rewrite the control.',
  ),
  task(
    '006',
    'Draft board pre-read: risk in business terms',
    'doing',
    'high',
    1,
    'board',
    'Lead with revenue, timing, and choices. Frameworks belong in the appendix, not the opening paragraph.',
  ),
  task(
    '007',
    'Complete DORA register mapping for three critical vendors',
    'todo',
    'high',
    5,
    'tprm',
    'LedgerWorks, CloudHarbor, and Nimbus CRM. Confirm the exit plan owner for each.',
    { riskRef: 'RSK-2026-011' },
  ),
  task(
    '008',
    'Build Q4 audit evidence index',
    'todo',
    'medium',
    7,
    'audit',
    'One index, one owner per control, and no orphaned screenshots. Test the index with a sample request.',
  ),
  task(
    '009',
    'Book risk owner 1:1: Priya / data retention exception',
    'todo',
    'medium',
    2,
    'relationship',
    'Ask what she needs to make the retention decision without escalating it to the board.',
    { riskRef: 'RSK-2026-009' },
  ),
  task(
    '010',
    'Review vendor steering minutes and log decisions',
    'done',
    'medium',
    -1,
    'tprm',
    'Two decisions logged, one assumption surfaced. Follow up on the BuildRight subprocessor notice.',
    { completedOffset: -1 },
  ),
  task(
    '011',
    'Refresh trust ledger inputs for risk committee',
    'todo',
    'low',
    8,
    'board',
    'Evidence coverage, follow-through, and objective consistency. Show the formula so the number is auditable.',
  ),
  task(
    '012',
    'Follow up on backup restoration evidence',
    'todo',
    'high',
    3,
    'evidence',
    'A backup that has never been restored is a hypothesis. Ask for the last successful test.',
    { riskRef: 'ISS-2026-021' },
  ),
  task(
    '013',
    'Prepare questions for board risk committee',
    'todo',
    'medium',
    4,
    'board',
    'Three questions max. Each should reveal a decision, not test knowledge.',
  ),
  task(
    '014',
    'Close loop: contractor access remediation',
    'done',
    'high',
    -1,
    'evidence',
    'All 18 accounts reviewed. Three elevated roles removed and re-approved by the system owner.',
    { completedOffset: -1 },
  ),
  task(
    '015',
    'Map new SaaS vendor onboarding to TPRM workflow',
    'todo',
    'low',
    10,
    'tprm',
    'Procurement keeps routing requests through email. Make the intake path obvious and measured.',
  ),
  task(
    '016',
    'Document vendor onboarding decision',
    'done',
    'medium',
    -1,
    'tprm',
    'Decision recorded with the accepted risk and the review date.',
    { completedOffset: -1 },
  ),
  task(
    '017',
    'Review audit evidence sample',
    'done',
    'medium',
    -2,
    'audit',
    'Two samples missing approval timestamps. Fixed before the walkthrough.',
    { completedOffset: -2 },
  ),
  task(
    '018',
    'Risk committee pre-read comments',
    'done',
    'high',
    -3,
    'board',
    'Cut the framework detail and added the revenue exposure. Better conversation.',
    { completedOffset: -3 },
  ),
  task(
    '019',
    'TPRM triage: new vendor intake',
    'done',
    'medium',
    -4,
    'tprm',
    'Routed one low-risk tool and escalated one restricted-data vendor.',
    { completedOffset: -4 },
  ),
];

const risks: RiskItem[] = [
  {
    id: 'risk-northwind-soc2',
    ref: 'RSK-2026-014',
    title: 'Northwind Analytics lacks current SOC 2 Type II evidence',
    type: 'risk',
    status: 'open',
    severity: 'high',
    owner: 'Priya Nair',
    businessUnit: 'Data & Analytics',
    due: date(2),
    framework: 'ISO 27001',
    control: 'A.5.19 — Supplier security',
    exposure: '$1.4M ARR reporting dependency; renewal on 21 Nov',
    decisionNeeded: false,
    createdAt: stamp(-12),
    updatedAt: stamp(-1, '17:20'),
    notes:
      'Northwind supports 31% of customer reporting. The SOC 2 report expired in September and the subprocessor list is four months old. Requested a bridge letter and a 24-hour breach notification addendum. Do not renew without evidence.',
  },
  {
    id: 'risk-finance-access-review',
    ref: 'RSK-2026-018',
    title: 'Privileged access review overdue for finance ERP',
    type: 'risk',
    status: 'in-progress',
    severity: 'critical',
    owner: 'Marcus Bell',
    businessUnit: 'Finance Systems',
    due: date(0),
    framework: 'ISO 27001',
    control: 'A.8.2 — Privileged access rights',
    exposure: 'ERP holds $48M of payment approvals',
    decisionNeeded: false,
    createdAt: stamp(-19),
    updatedAt: stamp(0, '11:40'),
    notes:
      'Three elevated contractor accounts remained active after their engagement ended. IT Ops has a 48-hour remediation window. Evidence is captured in the ticket, not in a slide.',
  },
  {
    id: 'decision-crm-compensating-control',
    ref: 'DEC-2026-007',
    title: 'Decide compensating control for CRM migration',
    type: 'decision',
    status: 'open',
    severity: 'high',
    owner: 'Elena Rossi',
    businessUnit: 'Revenue Operations',
    due: date(1),
    framework: 'Internal change policy',
    control: 'CHG-04 — Conditional go-live',
    exposure: 'Q1 pipeline at risk if migration slips two weeks',
    decisionNeeded: true,
    createdAt: stamp(-6),
    updatedAt: stamp(-1, '16:05'),
    notes:
      'Proposed path: conditional go-live with a reviewed access exception, daily reconciliation for 30 days, and a hard exit gate on 15 January 2027. The decision room needs a named risk owner and an explicit statement of the business trade-off.',
  },
  {
    id: 'issue-backup-evidence',
    ref: 'ISS-2026-021',
    title: 'Backup restoration evidence missing for finance system',
    type: 'issue',
    status: 'open',
    severity: 'medium',
    owner: 'Sam Okafor',
    businessUnit: 'IT Operations',
    due: date(5),
    framework: 'ISO 27001',
    control: 'A.8.13 — Backup management',
    exposure: 'A six-hour recovery objective that has never been proven',
    decisionNeeded: false,
    createdAt: stamp(-24),
    updatedAt: stamp(-2, '10:10'),
    notes:
      'The backup job runs successfully, but there is no current restoration test. A control running in production means nothing if we cannot prove it. Ask for the last successful restore and the time to recover.',
  },
  {
    id: 'risk-dora-register',
    ref: 'RSK-2026-011',
    title: 'DORA register incomplete for three critical vendors',
    type: 'risk',
    status: 'in-progress',
    severity: 'high',
    owner: 'Ki',
    businessUnit: 'Third-Party Risk',
    due: date(8),
    framework: 'DORA',
    control: 'Art. 28 — ICT third-party register',
    exposure: 'Regulatory notification readiness and supervisory review',
    decisionNeeded: false,
    createdAt: stamp(-31),
    updatedAt: stamp(-1, '09:30'),
    notes:
      'LedgerWorks, CloudHarbor, and Nimbus CRM are missing contract owners, exit-plan tests, or annual review dates. The register is not an inventory exercise; it is a map of concentration risk.',
  },
  {
    id: 'action-stale-contractor-access',
    ref: 'ACT-2026-033',
    title: 'Remove stale contractor access cohort',
    type: 'action',
    status: 'open',
    severity: 'high',
    owner: 'IT Operations',
    businessUnit: 'Enterprise',
    due: date(3),
    framework: 'ISO 27001',
    control: 'A.5.18 — Access rights',
    exposure: '18 accounts, 3 with elevated roles',
    decisionNeeded: false,
    createdAt: stamp(-8),
    updatedAt: stamp(-1, '14:45'),
    notes:
      'The access review is now a remediation action. Close it with evidence, not a promise. Owner confirmed for the remaining two accounts.',
  },
  {
    id: 'risk-retention-exception',
    ref: 'RSK-2026-009',
    title: 'Data retention exception for support recordings',
    type: 'risk',
    status: 'monitoring',
    severity: 'medium',
    owner: 'Legal & Privacy',
    businessUnit: 'Customer Success',
    due: date(11),
    framework: 'GDPR',
    control: 'Art. 5 — Storage limitation',
    exposure: 'Customer trust; potential regulatory inquiry exposure',
    decisionNeeded: false,
    createdAt: stamp(-44),
    updatedAt: stamp(-3, '15:15'),
    notes:
      'Support recordings are retained for 24 months instead of the policy standard of 12 months. Legal is assessing whether a documented exception is defensible. The business reason is quality assurance.',
  },
  {
    id: 'decision-ccm-pilot',
    ref: 'DEC-2026-008',
    title: 'Fund continuous control monitoring pilot',
    type: 'decision',
    status: 'open',
    severity: 'medium',
    owner: 'CFO Office',
    businessUnit: 'Enterprise',
    due: date(14),
    framework: 'Board risk appetite',
    control: 'RA-02 — Monitoring cadence',
    exposure: 'Manual evidence effort around 120 hours per quarter',
    decisionNeeded: true,
    createdAt: stamp(-10),
    updatedAt: stamp(-2, '11:20'),
    notes:
      'A 90-day pilot would cover privileged access, vendor evidence expiry, and backup restoration. The ask is $85k. The return is fewer surprises and less manual evidence collection.',
  },
  {
    id: 'issue-subprocessor-notice',
    ref: 'ISS-2026-022',
    title: 'Vendor subprocessor notice not assessed',
    type: 'issue',
    status: 'open',
    severity: 'high',
    owner: 'Ki',
    businessUnit: 'Third-Party Risk',
    due: date(2),
    framework: 'ISO 27001',
    control: 'A.5.19 — Supplier security',
    exposure: 'Data residency and notification obligations unclear',
    decisionNeeded: false,
    createdAt: stamp(-4),
    updatedAt: stamp(0, '08:55'),
    notes:
      'BuildRight CI added a US subprocessor. The notice is within the contractual window, but no assessment has been recorded. Vendor risk management is about asking the uncomfortable questions early.',
  },
  {
    id: 'risk-legacy-wiki',
    ref: 'RSK-2026-016',
    title: 'Legacy wiki contains outdated security policy links',
    type: 'risk',
    status: 'monitoring',
    severity: 'low',
    owner: 'Knowledge Management',
    businessUnit: 'Enterprise',
    due: date(21),
    framework: 'ISO 27001',
    control: 'To be mapped',
    exposure: 'Low; confusion risk for new joiners',
    decisionNeeded: false,
    createdAt: stamp(-60),
    updatedAt: stamp(-5, '10:00'),
    notes:
      'Several policy pages point to a retired intranet. No sensitive data exposed. Add redirects and an ownership check to the knowledge-base review.',
  },
];

const meetings: Meeting[] = [
  {
    id: 'meeting-morning-triage',
    title: 'Morning triage & risk standup',
    date: date(0),
    start: '08:45',
    end: '09:00',
    type: 'focus',
    location: 'Virtual',
    attendees: ['Ki', 'Sam Okafor'],
    owner: 'Ki',
    notes: 'Bring only decisions, not updates. Two minutes per person. End with what changed today.',
  },
  {
    id: 'meeting-crm-decision',
    title: 'Decision room: CRM migration exception',
    date: date(0),
    start: '10:30',
    end: '11:15',
    type: 'decision',
    location: 'Room 4B / Meet',
    attendees: ['Elena Rossi', 'Marcus Bell', 'Priya Nair', 'Ki'],
    owner: 'Alex Morgan',
    notes:
      'Decide: accept a conditional go-live with a compensating control, or delay two weeks. Ask for the business trade-off explicitly and name the risk owner in the room.',
  },
  {
    id: 'meeting-northwind-review',
    title: 'Vendor review: Northwind Analytics',
    date: date(0),
    start: '13:00',
    end: '13:30',
    type: 'vendor',
    location: 'Virtual',
    attendees: ['Priya Nair', 'Procurement', 'Legal', 'Ki'],
    owner: 'Ki',
    notes:
      'Ask: if the control failed tomorrow, how would we know before a customer did? Do not leave without an evidence date.',
  },
  {
    id: 'meeting-cfo-preread',
    title: 'Board pre-read sync: CFO',
    date: date(0),
    start: '15:30',
    end: '16:00',
    type: 'board',
    location: 'Virtual',
    attendees: ['Dana Whitfield', 'Alex Morgan'],
    owner: 'Alex Morgan',
    notes:
      'Translate exposure to revenue and timing. Remove framework jargon. Bring one slide with three decisions.',
  },
  {
    id: 'meeting-iso-walkthrough',
    title: 'ISO 27001 evidence walkthrough',
    date: date(1),
    start: '09:30',
    end: '10:15',
    type: 'audit',
    location: 'Virtual',
    attendees: ['Sam Okafor', 'Ki', 'Auditor'],
    owner: 'Ki',
    notes:
      'Walk the control, not the screenshot. Show how evidence is produced, reviewed, and retained.',
  },
  {
    id: 'meeting-tprm-working-group',
    title: 'TPRM working group',
    date: date(1),
    start: '14:00',
    end: '15:00',
    type: 'vendor',
    location: 'Room 2A',
    attendees: ['Procurement', 'Legal', 'IT Operations', 'Ki'],
    owner: 'Ki',
    notes: 'Agenda: DORA register gaps, BuildRight subprocessor, Northwind renewal gate.',
  },
  {
    id: 'meeting-audit-checkpoint',
    title: 'Audit readiness checkpoint',
    date: date(2),
    start: '11:00',
    end: '11:45',
    type: 'audit',
    location: 'Virtual',
    attendees: ['Alex Morgan', 'Sam Okafor'],
    owner: 'Alex Morgan',
    notes: 'Test the evidence index with two random requests. Gaps should be known, not discovered.',
  },
  {
    id: 'meeting-risk-committee',
    title: 'Risk committee',
    date: date(4),
    start: '10:00',
    end: '11:00',
    type: 'board',
    location: 'Board room',
    attendees: ['CFO', 'CISO', 'General Counsel', 'Alex Morgan'],
    owner: 'Alex Morgan',
    notes: 'Three decisions, one page of context. No surprises.',
  },
  {
    id: 'meeting-dora-deep-dive',
    title: 'DORA deep dive',
    date: date(6),
    start: '09:00',
    end: '10:30',
    type: 'vendor',
    location: 'Virtual',
    attendees: ['Ki', 'Procurement', 'Legal'],
    owner: 'Ki',
    notes: 'Complete the register and assign a contract owner for each critical vendor.',
  },
  {
    id: 'meeting-board-pre-read-review',
    title: 'Board risk committee pre-read review',
    date: date(8),
    start: '13:00',
    end: '14:00',
    type: 'board',
    location: 'Virtual',
    attendees: ['Dana Whitfield', 'Alex Morgan', 'Ki'],
    owner: 'Alex Morgan',
    notes: 'Final narrative review. Confirm the ask is explicit and the trade-offs are visible.',
  },
  {
    id: 'meeting-buildright-steering',
    title: 'Vendor steering: BuildRight CI',
    date: date(9),
    start: '14:00',
    end: '14:45',
    type: 'vendor',
    location: 'Virtual',
    attendees: ['Engineering', 'Procurement', 'Ki'],
    owner: 'Ki',
    notes: 'Subprocessor assessment, SBOM commitment, and incident notification clause.',
  },
  {
    id: 'meeting-access-signoff',
    title: 'Quarterly access review sign-off',
    date: date(12),
    start: '09:00',
    end: '09:30',
    type: 'audit',
    location: 'Virtual',
    attendees: ['IT Operations', 'System owners', 'Ki'],
    owner: 'Ki',
    notes: 'Every exception has a name and an expiry date. No blank owners.',
  },
];

const vendors: Vendor[] = [
  {
    id: 'vendor-northwind',
    ref: 'VND-001',
    vendor: 'Northwind Analytics',
    service: 'Customer analytics SaaS',
    tier: 1,
    riskRating: 'high',
    status: 'in-review',
    reviewDue: date(2),
    lastReview: date(-363),
    owner: 'Ki',
    dataClass: 'Restricted',
    progress: 55,
    framework: 'ISO 27001',
    concerns: [
      'SOC 2 Type II report expired in September',
      'Subprocessor list is four months old',
      'No 24-hour breach notification clause',
    ],
    notes:
      'Supports 31% of customer reporting. Renewal gate on 21 Nov. Do not accept a verbal assurance; require a bridge letter and updated subprocessor list.',
  },
  {
    id: 'vendor-ledgerworks',
    ref: 'VND-002',
    vendor: 'LedgerWorks',
    service: 'Payment reconciliation',
    tier: 1,
    riskRating: 'critical',
    status: 'escalated',
    reviewDue: date(-3),
    lastReview: date(-400),
    owner: 'Alex Morgan',
    dataClass: 'Restricted',
    progress: 35,
    framework: 'DORA',
    concerns: [
      'DORA register mapping incomplete',
      'Exit plan has never been tested',
      'Concentration risk across two portfolio companies',
    ],
    notes:
      'Escalate to the COO. The business cannot tolerate an untested exit plan for a Tier 1 payment dependency.',
  },
  {
    id: 'vendor-cloudharbor',
    ref: 'VND-003',
    vendor: 'CloudHarbor',
    service: 'Cloud infrastructure',
    tier: 1,
    riskRating: 'medium',
    status: 'complete',
    reviewDue: date(58),
    lastReview: date(-307),
    owner: 'Ki',
    dataClass: 'Restricted',
    progress: 100,
    framework: 'ISO 27001',
    concerns: ['No open concerns; annual review complete'],
    notes:
      'Current ISO 27001 certificate and a tested exit plan. Keep the evidence link in the register, not in a personal folder.',
  },
  {
    id: 'vendor-peoplefirst',
    ref: 'VND-004',
    vendor: 'PeopleFirst HR',
    service: 'HRIS & payroll',
    tier: 2,
    riskRating: 'medium',
    status: 'awaiting-vendor',
    reviewDue: date(5),
    lastReview: date(-360),
    owner: 'Ki',
    dataClass: 'Confidential',
    progress: 70,
    framework: 'SOC 2',
    concerns: ['DPA renewal pending', 'Data deletion evidence requested'],
    notes:
      'The renewal is blocked on the DPA. Legal has the redline. Ask for the deletion runbook and a named contact.',
  },
  {
    id: 'vendor-securemail',
    ref: 'VND-005',
    vendor: 'SecureMail',
    service: 'Email security gateway',
    tier: 2,
    riskRating: 'low',
    status: 'in-review',
    reviewDue: date(21),
    lastReview: date(-344),
    owner: 'Alex Morgan',
    dataClass: 'Confidential',
    progress: 80,
    framework: 'ISO 27001',
    concerns: ['Penetration test summary pending'],
    notes:
      'Low residual risk. The only open item is the pen test summary. Follow up after the current review cycle.',
  },
  {
    id: 'vendor-buildright',
    ref: 'VND-006',
    vendor: 'BuildRight CI',
    service: 'CI/CD and artifact storage',
    tier: 2,
    riskRating: 'high',
    status: 'in-review',
    reviewDue: date(9),
    lastReview: date(-355),
    owner: 'Ki',
    dataClass: 'Restricted',
    progress: 45,
    framework: 'SOC 2',
    concerns: [
      'New US subprocessor not assessed',
      'No SBOM commitment',
      'Incident notification clause below policy',
    ],
    notes:
      'Engineering depends on this pipeline. The subprocessor notice is timely, but the assessment is missing. Raise it in the steering meeting.',
  },
  {
    id: 'vendor-atlas',
    ref: 'VND-007',
    vendor: 'Atlas Research',
    service: 'Market intelligence',
    tier: 3,
    riskRating: 'low',
    status: 'complete',
    reviewDue: date(120),
    lastReview: date(-240),
    owner: 'Alex Morgan',
    dataClass: 'Internal',
    progress: 100,
    framework: 'Internal TPRM',
    concerns: [],
    notes: 'Low-risk research subscription. No restricted data. Reviewed and closed.',
  },
  {
    id: 'vendor-nimbus',
    ref: 'VND-008',
    vendor: 'Nimbus CRM',
    service: 'Sales CRM',
    tier: 1,
    riskRating: 'high',
    status: 'awaiting-vendor',
    reviewDue: date(-1),
    lastReview: date(-365),
    owner: 'Alex Morgan',
    dataClass: 'Restricted',
    progress: 60,
    framework: 'ISO 27001',
    concerns: ['Migration exception open', 'Admin MFA gap until January'],
    notes:
      'Connected to the CRM migration decision. The vendor needs to confirm the MFA timeline in writing before the exception is approved.',
  },
];

const board: Array<Omit<BoardBrief, 'bodyHtml'>> = [
  {
    id: 'board-q4-pre-read',
    ref: 'BRD-001',
    title: 'Q4 Board Risk Committee — Executive pre-read',
    date: date(14),
    audience: 'Board Risk Committee',
    status: 'drafting',
    owner: 'Alex Morgan',
    decisions: [
      'Approve a 90-day continuous control monitoring pilot ($85k).',
      'Accept the CRM migration compensating control, with a reviewed exit gate on 15 January 2027.',
      'Note the Northwind Analytics exposure and require evidence before the 21 November renewal.',
    ],
    body: `## The ask

Approve three decisions that protect Q1 revenue while keeping our risk posture explicit.

## What changed

- The CRM migration would consolidate three customer data flows, but the legacy access review is incomplete.
- Northwind Analytics supports 31% of customer reporting; its SOC 2 evidence has expired.
- DORA register gaps are contained to three vendors, but the remediation path needs an owner and funding.

## Risk in business terms

A two-week CRM delay costs an estimated $180k in pipeline momentum. A conditional go-live without a compensating control would leave 14,000 customer records in a system without current access evidence. The proposed control reduces that exposure to a reviewed, time-bound exception with a hard exit gate.

## Decisions requested

1. Approve the conditional go-live and the 15 January exit gate.
2. Fund the continuous control monitoring pilot.
3. Endorse the vendor evidence gate before the Northwind renewal.

## What good looks like

No surprises. Every accepted risk has a name, a date, and evidence.`,
  },
  {
    id: 'board-tprm-steering',
    ref: 'BRD-002',
    title: 'Steering: Third-Party Risk Remediation',
    date: date(8),
    audience: 'Executive Steering',
    status: 'in-review',
    owner: 'Ki',
    decisions: [
      'Escalate LedgerWorks exit-plan testing to the COO.',
      'Approve 0.5 FTE for vendor evidence collection through Q1.',
    ],
    body: `## Why this matters now

Three critical vendors have evidence or exit-plan gaps. The issue is not the number of vendors; it is the concentration of business dependency and the absence of a tested recovery path.

## Where we are

- Northwind: evidence request outstanding; renewal gate on 21 November.
- LedgerWorks: exit plan untested; escalation required.
- BuildRight CI: new subprocessor notice awaiting assessment.

## Decisions requested

1. Escalate LedgerWorks exit-plan testing to the COO.
2. Approve 0.5 FTE through Q1 to close evidence gaps and keep the register current.

## Trade-off

The additional capacity costs roughly $42k for the quarter. The alternative is to continue relying on manual chasing, which has already delayed two reviews.`,
  },
  {
    id: 'board-iso-readiness',
    ref: 'BRD-003',
    title: 'ISO 27001 surveillance: readiness posture',
    date: date(2),
    audience: 'Audit & Risk Committee',
    status: 'final',
    owner: 'Alex Morgan',
    decisions: ['Note readiness status and the two known evidence gaps.'],
    body: `## Readiness

The surveillance audit is predictable. The evidence index is current for 87% of controls. Two gaps are known and owned: backup restoration evidence and vendor access review timestamps.

## The approach

Walk the auditor through the control, not the slide deck. Show where evidence is produced, who reviews it, and how long it is retained. Explain gaps honestly and attach a remediation date.

## Ask

Note the two open gaps and the remediation dates. No additional funding is required.`,
  },
];

const todayObjectives: Objective[] = [
  {
    id: 'obj-today-1',
    text: 'Make one risk decision visible, intentional, and owned.',
    category: 'judgment',
    done: false,
  },
  {
    id: 'obj-today-2',
    text: 'Close the SOC 2 evidence loop with Northwind.',
    category: 'evidence',
    done: false,
  },
  {
    id: 'obj-today-3',
    text: 'Ask one question nobody else is asking in the vendor review.',
    category: 'influence',
    done: false,
  },
  {
    id: 'obj-today-4',
    text: 'Translate the CRM exception into business language for the CFO.',
    category: 'influence',
    done: false,
  },
];

const pastPlans: Array<{ offset: number; intent: string; objectives: Objective[] }> = [
  {
    offset: -1,
    intent: 'Turn the access review from a status update into a decision.',
    objectives: [
      { id: 'obj-y1-1', text: 'Name the owner for the access remediation.', category: 'judgment', done: true },
      { id: 'obj-y1-2', text: 'Capture evidence in the ticket, not a slide.', category: 'evidence', done: true },
      { id: 'obj-y1-3', text: 'Protect the vendor steering agenda from status theatre.', category: 'influence', done: true },
    ],
  },
  {
    offset: -2,
    intent: 'Make the audit feel routine by testing our own evidence first.',
    objectives: [
      { id: 'obj-y2-1', text: 'Pull two random evidence samples and inspect them.', category: 'evidence', done: true },
      { id: 'obj-y2-2', text: 'Fix the timestamp gap before the walkthrough.', category: 'execution', done: true },
      { id: 'obj-y2-3', text: 'Brief the control owner on the narrative.', category: 'relationship', done: true },
      { id: 'obj-y2-4', text: 'Draft the board narrative opening.', category: 'influence', done: false },
    ],
  },
  {
    offset: -3,
    intent: 'Speak the language of business, not just IT.',
    objectives: [
      { id: 'obj-y3-1', text: 'Rewrite the top risk in revenue terms.', category: 'influence', done: true },
      { id: 'obj-y3-2', text: 'Confirm the review date with the CFO office.', category: 'execution', done: true },
      { id: 'obj-y3-3', text: 'Read the board pack as an outsider would.', category: 'judgment', done: false },
    ],
  },
  {
    offset: -4,
    intent: 'Build the system, not just the evidence.',
    objectives: [
      { id: 'obj-y4-1', text: 'Route new vendor intake through the TPRM workflow.', category: 'execution', done: true },
      { id: 'obj-y4-2', text: 'Remove one manual evidence step.', category: 'judgment', done: true },
      { id: 'obj-y4-3', text: 'Share the decision log with the working group.', category: 'relationship', done: true },
      { id: 'obj-y4-4', text: 'Ask what would make the process easier to trust.', category: 'influence', done: true },
    ],
  },
];

const quoteSeed: Array<{
  text: string;
  category: string;
  timestamp?: string;
}> = [
  { text: 'Audits are only stressful when GRC is weak.', category: 'Audits', timestamp: '6:03' },
  { text: 'In a healthy environment, audits are predictable.', category: 'Audits', timestamp: '6:07' },
  { text: 'You walk the auditor through controls.', category: 'Audits', timestamp: '6:09' },
  { text: 'Show evidence pulled directly from your GRC system.', category: 'Audits', timestamp: '6:12' },
  { text: 'Explain gaps honestly.', category: 'Audits', timestamp: '6:15' },
  { text: 'Document findings and remediation plans.', category: 'Audits', timestamp: '6:17' },
  { text: 'No scrambling, no panic.', category: 'Audits', timestamp: '6:19' },
  { text: 'Audits are not about catching you; they are about testing maturity.', category: 'Audits', timestamp: '6:23' },
  { text: 'Strong GRC turns audits into routine conversations.', category: 'Audits', timestamp: '6:28' },
  { text: 'Strong GRC understands how the company actually works.', category: 'Strong GRC', timestamp: '7:56' },
  { text: 'Strong GRC professionals understand revenue flows, data flows, regulatory pressure, and human behavior.', category: 'Strong GRC', timestamp: '8:00' },
  { text: 'They know when to push back and when to compromise.', category: 'Strong GRC', timestamp: '8:06' },
  { text: 'They communicate risk without sounding like the sky is falling.', category: 'Strong GRC', timestamp: '8:11' },
  { text: 'They become trusted.', category: 'Strong GRC', timestamp: '8:14' },
  { text: 'Trust is the real currency in governance, risk, and compliance.', category: 'Strong GRC', timestamp: '8:14' },
  { text: 'See cybersecurity as decisions, not just tools.', category: 'Strong GRC', timestamp: '9:26' },
  { text: 'Make risk decisions visible, intentional, and owned.', category: 'Strong GRC', timestamp: '5:57' },
  { text: 'GRC is influence, not just administration.', category: 'Strong GRC', timestamp: '6:57' },
  { text: 'Weak GRC lives inside checklists.', category: 'Weak GRC', timestamp: '7:52' },
  { text: 'A control running perfectly in production means nothing if you cannot prove it.', category: 'Weak GRC', timestamp: '3:45' },
  { text: "If it's not documented, it doesn't exist.", category: 'Weak GRC', timestamp: '3:40' },
  { text: 'Most major security failures are not technical failures; they are decision failures.', category: 'Weak GRC', timestamp: '5:47' },
  { text: 'Someone knew, someone delayed, someone assumed it would be fine.', category: 'Weak GRC', timestamp: '5:52' },
  { text: "If you're looking for constant hands-on technical work, you'll struggle in GRC.", category: 'Weak GRC', timestamp: '8:33' },
  { text: "Don't just memorize standards; develop judgment.", category: 'Weak GRC', timestamp: '7:16' },
  { text: 'Separate noise from real risk.', category: 'Daily triage', timestamp: '1:06' },
  { text: 'Everything sounds urgent, but only a few things are truly risky.', category: 'Daily triage', timestamp: '1:09' },
  { text: 'Start your day with context, not just documents.', category: 'Daily triage', timestamp: '0:58' },
  { text: "GRC isn't theory; it's real work and real decisions.", category: 'Daily triage', timestamp: '0:02' },
  { text: 'Emails tell you what kind of day you will have.', category: 'Daily triage', timestamp: '0:33' },
  { text: 'Your first job is deciding what matters today.', category: 'Daily triage', timestamp: '1:03' },
  { text: 'Noise is the enemy of risk management.', category: 'Daily triage', timestamp: '1:16' },
  { text: "Don't just collect evidence; build the system.", category: 'Daily triage', timestamp: '3:47' },
  { text: 'GRC is paid for judgment, not checklists.', category: 'Decision & communication', timestamp: '7:14' },
  { text: 'Translate technical reality into business language.', category: 'Decision & communication', timestamp: '2:33' },
  { text: "Don't block progress; reframe the conversation.", category: 'Decision & communication', timestamp: '2:12' },
  { text: 'Your role is to ask the questions nobody else is asking.', category: 'Decision & communication', timestamp: '2:17' },
  { text: "Don't argue; identify compensating controls.", category: 'Decision & communication', timestamp: '5:30' },
  { text: 'Reframe business pressure into structured decisions.', category: 'Decision & communication', timestamp: '2:39' },
  { text: 'Meetings are not interruptions; they are decision rooms.', category: 'Decision & communication', timestamp: '1:48' },
  { text: 'Good GRC professionals sound calm, precise, and grounded.', category: 'Decision & communication', timestamp: '2:44' },
  { text: 'Turn technical pressure into structured business outcomes.', category: 'Decision & communication', timestamp: '2:41' },
  { text: 'Third-party risk is where breaches often live.', category: 'TPRM', timestamp: '5:02' },
  { text: 'Vendor risk management is about asking the uncomfortable questions.', category: 'TPRM', timestamp: '4:28' },
  { text: 'Vendor onboarding is a gateway for risk.', category: 'TPRM', timestamp: '4:24' },
  { text: 'Evidence is the heartbeat of a compliant organization.', category: 'TPRM', timestamp: '3:40' },
  { text: 'Controls are only as good as their documentation.', category: 'TPRM', timestamp: '3:39' },
  { text: 'Leaders want answers, not just frameworks.', category: 'Leadership & influence', timestamp: '6:46' },
  { text: 'Turn complex risk data into simple narratives.', category: 'Leadership & influence', timestamp: '6:59' },
  { text: 'Help leaders make informed decisions without fear.', category: 'Leadership & influence', timestamp: '7:03' },
  { text: 'Trusted advisors define the best GRC careers.', category: 'Leadership & influence', timestamp: '7:08' },
  { text: 'Your audience dictates your message.', category: 'Leadership & influence', timestamp: '6:38' },
  { text: 'Show the trade-offs of every decision.', category: 'Leadership & influence', timestamp: '7:01' },
  { text: "Don't let the board be surprised.", category: 'Leadership & influence', timestamp: '7:34' },
  { text: 'Speak the language of business, not just IT.', category: 'Leadership & influence', timestamp: '2:37' },
  { text: 'Influence comes from understanding the bottom line.', category: 'Leadership & influence', timestamp: '7:00' },
  { text: 'Move from a checklist mindset to a trusted advisor.', category: 'Career & mindset', timestamp: '7:06' },
  { text: 'GRC is not a soft role; it is a vital business function.', category: 'Career & mindset', timestamp: '7:12' },
  { text: 'Play the long-term game.', category: 'Career & mindset', timestamp: '8:29' },
  { text: 'GRC is a continuous orientation, not a one-time task.', category: 'Career & mindset', timestamp: '8:52' },
];

const questionSeed: Array<{
  text: string;
  category: string;
  audience: NonNullable<Insight['audience']>;
}> = [
  { text: 'If this control failed tomorrow, how would we know before a customer did?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'What evidence would still exist if the system went down today?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'Who owns the decision if the vendor misses the remediation date?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'Where does this process depend on one person being heroic?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'What are we assuming will be fine, and who would be surprised?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'Which revenue flow depends on this vendor, and what is our tolerance for downtime?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'What compensating control would make this risk acceptable to you?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'If the auditor asked for proof right now, what would we have to reconstruct?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'What would make you comfortable accepting this risk without a control?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'Where have we documented the exception, and when does it expire?', category: 'Ask a risk owner', audience: 'risk-owner' },
  { text: 'Which risk decision needs your sponsorship this month?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'What level of surprise is acceptable to the board?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'Where are we trading speed for evidence, and is that trade explicit?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'What would good look like in 90 days for our audit posture?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'Which business goal is most exposed to a third-party failure?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'How much risk are we willing to own to protect the growth plan?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'What decision are we avoiding because it is uncomfortable?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'What would you want to know first if a critical vendor failed?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'Which risk would you rather fund now than explain later?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'What would make this a one-way door instead of a reversible decision?', category: 'Ask leadership', audience: 'leadership' },
  { text: 'What did you decide today, and where is it written down?', category: 'Ask yourself', audience: 'self' },
  { text: 'Which open item is waiting on courage rather than information?', category: 'Ask yourself', audience: 'self' },
  { text: 'What did you hear in a meeting that nobody wrote down?', category: 'Ask yourself', audience: 'self' },
  { text: 'Where are you collecting evidence instead of building a system?', category: 'Ask yourself', audience: 'self' },
  { text: 'What would a trusted advisor say that a checklist cannot?', category: 'Ask yourself', audience: 'self' },
];

async function writeInsights(): Promise<void> {
  let index = 0;
  for (const quote of quoteSeed) {
    index += 1;
    const insight: Omit<Insight, 'text'> = {
      id: `quote-${String(index).padStart(3, '0')}`,
      kind: 'quote',
      category: quote.category,
      source: 'Cyber Explainer · YouTube',
      timestamp: quote.timestamp,
      attribution: 'Cyber Explainer',
    };
    await writeRecord('insights', insight as Insight, quote.text);
  }
  for (const question of questionSeed) {
    index += 1;
    const insight: Omit<Insight, 'text'> = {
      id: `question-${String(index).padStart(3, '0')}`,
      kind: 'question',
      category: question.category,
      audience: question.audience,
    };
    await writeRecord('insights', insight as Insight, question.text);
  }
}

export async function seedIfEmpty(): Promise<void> {
  await ensureDataDirectory();
  try {
    await fs.access(`${dataDir}/.seeded`);
    return;
  } catch {
    // First run: write the demonstration workspace.
  }

  await Promise.all([
    ...tasks.map((item) => writeRecord('tasks', item, item.notes)),
    ...risks.map((item) => writeRecord('risks', item, item.notes)),
    ...meetings.map((item) => writeRecord('meetings', item, item.notes)),
    ...vendors.map((item) => writeRecord('vendors', item, item.notes)),
    ...board.map((item) => writeRecord('board', item, item.body)),
  ]);

  await writeRecord(
    'objectives',
    {
      id: date(0),
      date: date(0),
      intent: 'Slow down enough to make the decision explicit — then move with conviction.',
      objectives: todayObjectives,
    },
    '',
  );

  for (const plan of pastPlans) {
    await writeRecord(
      'objectives',
      {
        id: date(plan.offset),
        date: date(plan.offset),
        intent: plan.intent,
        objectives: plan.objectives,
      },
      '',
    );
  }

  await writeInsights();
  await replaceFile(`${dataDir}/.seeded`, `${new Date().toISOString()}\n`);

  console.log(`MissionGRC demo workspace seeded in ${dataDir}`);
}

// Keep the type import meaningful for future board seeding helpers.
export type SeededBoardBrief = BoardBrief;
