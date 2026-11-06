# MissionGRC — Pitch

### A calm, evidence-first daily workspace for governance, risk, and compliance.

| Field | Value |
| --- | --- |
| Product | MissionGRC |
| Status | Working skeleton, ready for a structured pilot |
| Primary users | GRC specialists and GRC leads |
| Secondary audience | Risk owners, executives, board and steering committees |
| Technical reference | [architecture.md](./architecture.md) |

> Trust is not a document. It is a pattern of decisions that are owned, dated, evidenced,
> and explained in language the business can use.

---

## 1. The one-line

**MissionGRC turns the daily GRC workload into a visible chain of owned decisions, dated
evidence, and board-ready narrative.**

It does not replace the enterprise GRC platform. It makes the work that feeds that platform
legible, consistent, and easier to defend.

---

## 2. The problem in plain terms

Most GRC teams do not lack frameworks. They lack a daily place where the work lines up.

The framework lives in a control library. The decision lives in a meeting. The evidence lives
in an inbox. The vendor risk lives in a spreadsheet. The board narrative is rebuilt from memory
the week before the meeting. The status update becomes a scavenger hunt.

The result is predictable:

- Decisions are made, but not recorded as decisions.
- Open items have owners, but not always dates or evidence.
- Vendor reviews are completed, but not always before renewal.
- The board receives a polished narrative that is only loosely connected to daily records.
- The specialist becomes the human integration layer between five tools and a slide deck.
- When one person is away, the story becomes hard to reconstruct.

This is not a framework problem. It is an operating problem.

---

## 3. What the status quo costs

The cost is rarely visible as one line item. It shows up in five places.

| Symptom | What it costs | What MissionGRC changes |
| --- | --- | --- |
| Decisions are not recorded as decisions | The same conversation returns; ownership stays vague | Open items of type `decision` with owner, due date, exposure, and notes |
| Evidence is collected at audit time | Rework, stale proof, and last-minute pressure | Evidence coverage is visible every day, not only before an audit |
| Vendor risk is tracked in inboxes and spreadsheets | Renewal surprises and untested exit paths | Tier, status, progress, review date, and concerns in one review record |
| The board pack is rebuilt from scratch | Narrative drift and wasted senior time | A living brief with explicit decisions requested and a Markdown body |
| Daily work is invisible | Key-person dependency and uneven follow-through | Task flow, daily objectives, and a consistency ledger |

A simple way to size the problem without borrowing someone else's benchmark:

```text
annual operating cost =
  hours spent reconstructing status × loaded hourly cost
+ decisions delayed × cost of delay
+ evidence and board-pack rework
+ renewal or audit surprises
+ key-person concentration risk
```

Fill in your own numbers. The point is not a dramatic statistic. The point is that the cost is
recurring, distributed, and usually invisible until something goes wrong.

---

## 4. The reframe

Governance, risk, and compliance is often described as a documentation function. In practice,
it is a **decision function**.

- A risk is a decision about what uncertainty to accept.
- A control is a decision about how to detect or reduce that uncertainty.
- A vendor review is a decision about dependency.
- A board brief is a decision request.
- An audit is a test of whether the decisions were real.

When the decisions are visible, the documents become easier to produce and easier to defend.
When they are not, the documents become the work.

MissionGRC is built around one operating loop:

```text
Set intent → Triage → Decide → Evidence → Narrate → Reflect
```

Each surface in the product exists to move the work one step around that loop.

---

## 5. The solution

MissionGRC is a server-rendered Angular workspace with a small Express API and a Markdown
repository. It gives one GRC team a shared daily operating picture.

### 5.1 The eight surfaces

| Surface | Question it answers | What it produces |
| --- | --- | --- |
| **Today** | What matters today, and are we moving? | Daily intent, trust balance, pulse metrics, open items, meetings, vendor watchlist, board card, focus tasks |
| **Tasks** | What is the day's execution load? | A flow board across To do, In progress, Blocked, and Done, with filters and search |
| **Decision room** | Where does risk become a choice? | A calendar of decision, vendor, audit, board, one-on-one, and focus meetings |
| **Daily objectives** | What did we commit to, and did we finish? | A daily intent, categorized objectives, completion, and a consistency history |
| **Open items** | What is owned, dated, and evidenced? | Risks, issues, decisions, and actions with refs, severity, owner, due date, framework, control, exposure, and notes |
| **Third-party risk** | Where does breach or dependency risk live? | Tiered vendor reviews with risk rating, status, progress, review dates, data class, and concerns |
| **Board room** | What are we asking leadership to decide? | Board and steering briefs with explicit decisions requested and an editable Markdown narrative |
| **Trust library** | How do we turn technical reality into business language? | Reusable quotes and questions for risk owners, leadership, and self-reflection |

### 5.2 The trust balance

The dashboard shows a single number, but the number is not a black box.

```text
trust balance =
  35% evidence coverage
+ 35% follow-through
+ 30% weekly objective consistency
```

- **Evidence coverage** is the share of open risks with both a framework and a control documented.
- **Follow-through** is tasks completed this week divided by tasks created this week.
- **Consistency** is the average daily objective completion across the current week.

The inputs are visible beside the score. The formula is documented. The score is directional, not
an audit opinion. It rewards the behaviors that make assurance believable: documentation,
follow-through, and consistency.

That distinction matters. A score that pretends to measure control effectiveness would be
misleading. A score that measures whether the operating discipline exists is useful.

### 5.3 The data stays readable

Every task, open item, meeting, daily plan, vendor review, board brief, quote, and question is a
Markdown file with YAML frontmatter.

That means:

- You can read the workspace without the application.
- You can diff changes in Git.
- You can back up a folder.
- You can migrate without an export tool.
- You can review a board brief as plain text.
- You are not training a proprietary system on your risk data.

The trade-off is equally clear: Markdown is not a multi-writer database. MissionGRC is designed
for one writable instance and a small team. It is honest about that boundary.

---

## 6. A day in the workspace

*Illustrative, based on the seeded demo workspace.*

**08:10 — Set the intent.**
The dashboard opens with today's intent: “Slow down enough to make the decision explicit —
then move with conviction.” The trust balance sits beside its three inputs. Four pulse metrics
show open items, open tasks, overdue work, and vendor actions. The focus list is short enough to
be useful.

**09:30 — Enter the decision room.**
The calendar shows a CRM migration decision, a Northwind renewal gate, and an audit checkpoint.
Each meeting has a type, owner, attendees, and notes. The decision is not left in a chat thread.

**11:00 — Chase the evidence.**
A task is linked to `RSK-2026-014` by `riskRef`. The open-item record names the framework, the
control, the business exposure, the owner, and the due date. The vendor review shows 55%
progress and the three concerns that must be closed before renewal. Updating progress writes a
Markdown file.

**15:00 — Shape the narrative.**
The board room holds a Q4 pre-read and an ISO 27001 surveillance brief. Each has a status, an
audience, and explicit decisions requested. The body is edited in Markdown and rendered safely.
The narrative is built from the same records the team used all day.

**17:00 — Close the loop.**
Completed tasks move to done. The ledger shows the week's task and objective bars. The streak
counts consecutive days with at least one completed task or objective. Tomorrow starts with a
record, not a reconstruction.

---

## 7. For the GRC specialist

MissionGRC is designed for the person who does the work, not only the person who reports on it.

### What changes

- **You stop being the human integration layer.** Tasks, open items, meetings, vendors,
  objectives, and board narrative share one workspace.
- **Decisions leave a trail.** A decision is a record with an owner, a date, and the exposure
  that justified it.
- **Evidence coverage is visible daily.** You can see the gaps before an auditor or a board
  member finds them.
- **The board narrative accumulates.** You are not rebuilding the story from memory every quarter.
- **The day has a shape.** Intent, focus tasks, decision room, and a closing ledger make the work
  deliberate rather than reactive.
- **Your data is portable.** Markdown and YAML mean the workspace can be read, reviewed, backed
  up, and moved.
- **The interface stays calm.** Warm paper, forest green, restrained borders, and editorial
  typography keep attention on the decision instead of the dashboard chrome.

### What it feels like

Less status chasing. Fewer “where are we on this?” messages. A shorter path from a meeting to a
record. A board pre-read that starts with the decision, not the framework.

---

## 8. For the executive

MissionGRC gives leadership a decision-ready view without asking them to learn a GRC platform.

### What changes

- **You see the decision, not just the framework.** Each brief states what is being asked, who
  owns it, and what exposure is being accepted.
- **Risk is translated into business language.** The open-item record carries business unit,
  exposure, framework, control, owner, and due date.
- **Third-party concentration is visible.** Tier, risk rating, review status, progress, and
  renewal date sit beside the concerns.
- **Evidence coverage is transparent.** You can see how much of the open portfolio has both a
  framework and a control documented.
- **Overdue work is not hidden.** The dashboard counts it and the ledger shows the trend.
- **The score is inspectable.** The trust balance is a weighted formula with visible inputs, not
  a vendor mystery.
- **The operating footprint is small.** One Node process, one data directory, no database.
- **The narrative is consistent.** The board brief and the daily record are built from the same
  source.

### What it does not claim

MissionGRC does not certify compliance, replace the enterprise GRC platform, or automate
control testing. It makes the daily operating discipline visible. That is the layer most
organizations struggle to evidence.

---

## 9. What makes it different

| Differentiator | Why it matters |
| --- | --- |
| **Decision-first, not document-first** | Every surface asks what needs to be decided, by whom, and by when |
| **Visible evidence arithmetic** | The trust balance shows its inputs; the workspace does not hide behind a score |
| **Board-ready by default** | Board and steering briefs carry explicit decisions requested, not just commentary |
| **Markdown-native** | Records are readable, diffable, portable, and independent of the app |
| **One operating loop** | Daily execution and executive narrative share the same records |
| **Deterministic logic** | No model, no opaque ranking, no unexplainable recommendation |
| **Calm design** | Tabler structure with a paper-and-forest editorial layer; built for sustained daily use |
| **Server-rendered** | Public entry is indexable; private pages render with resolved data and hydrate without refetching |
| **Small operational surface** | No database, queue, or worker to operate for a single-team deployment |
| **Honest scope** | The product states what it is not, which makes the claims it does make easier to trust |

---

## 10. What it is not

| Not this | Why the distinction matters |
| --- | --- |
| A replacement for Archer, ServiceNow, OneTrust, or a similar platform | Those systems own enterprise workflow, control libraries, and regulated record-keeping |
| A multi-tenant SaaS product | One workspace, one data directory, no tenant isolation |
| An automated control-monitoring system | Evidence coverage is computed from documented risk records, not live tests |
| A vendor portal or questionnaire engine | Vendor records are internal working reviews |
| An audit opinion or certification | The trust balance is a directional signal |
| A document management system | No version history, approval workflow, or retention engine |
| An AI product | Calculations and rankings are deterministic and inspectable |
| A static site or GitHub Pages app | Auth, SSR, and writable storage require a Node.js runtime |

Saying this plainly is part of the pitch. A tool that overstates its scope creates a new trust
problem.

---

## 11. Security and deployment, honestly

MissionGRC is a working skeleton. It has real controls and real gaps.

### Implemented

- scrypt password hashing with per-account salts and constant-time comparison.
- HMAC-SHA256 signed session cookies with an eight-hour lifetime.
- `HttpOnly`, `SameSite=Lax`, and `Secure`-when-HTTPS cookie flags.
- Login throttling: ten failures per ten minutes per IP and username.
- Cross-origin write rejection through an `Origin` check.
- Security headers for MIME sniffing, framing, referrer policy, and device permissions.
- HTML escaping before Markdown rendering.
- Path-safe record IDs and atomic per-file writes.
- Private pages marked `noindex, nofollow`; only `/login` is indexable.
- A server-side auth gate plus an Angular route guard.

### Not yet implemented

- SSO, SAML, OIDC, MFA, or password reset.
- Role-based access control. Both demo accounts share one workspace.
- An immutable, actor-attributed audit log.
- Encryption at rest or a CSP header.
- Multi-instance coordination or file locking.
- Automated backup, health checks, or a full test suite.

### Deployment shape

A single Node.js process behind a TLS reverse proxy, with a persistent data directory:

```text
Browser → Nginx (TLS) → MissionGRC (Express + Angular SSR) → Markdown data directory
```

No database. No queue. No background worker. Backups are a folder archive or volume snapshot.
This is a deliberate trade-off for a small team, not a claim of enterprise scale.

---

## 12. How to measure a pilot

Do not start with a demo. Start with a baseline.

### Pilot design

- **Scope:** one GRC team, one business unit, or one portfolio.
- **Duration:** four weeks.
- **Inputs:** ten open items, five vendors, one upcoming board or steering meeting.
- **Rhythm:** set intent daily, use the decision room for real meetings, update records the same
  day, review the ledger weekly.
- **Review:** compare the baseline with the end of week four.

### Measures

| Measure | Definition | Why it matters |
| --- | --- | --- |
| **Owned and dated open items** | Share of open items with an owner and a due date | Ownership is the first test of manageability |
| **Evidenced open items** | Share with both a framework and a control documented | Shows whether the portfolio is defensible |
| **Overdue items** | Count of past-due open risks and tasks | Reveals drift and unclear decisions |
| **Vendor reviews before renewal** | Share completed before the renewal gate | Prevents last-minute dependency surprises |
| **Board pre-read lead time** | Days the brief is ready before the meeting | Measures narrative readiness |
| **Daily objective completion** | Completed objectives divided by planned objectives | Measures operating consistency |
| **Active days** | Days with at least one completed task or objective | Measures whether the workspace became a habit |

Set the targets with the team. A pilot is credible when the baseline is visible and the
comparison is honest, not when the vendor supplies a flattering benchmark.

### Kill criteria

Stop or redesign the pilot if:

- the team is not using the workspace at least four days a week;
- open items are not more consistently owned and dated;
- the board narrative is not faster to produce;
- the workspace becomes another status-reporting obligation rather than a working tool.

A clear stop rule protects both the team and the product.

---

## 13. Objections, answered

### “We already have a GRC platform.”

Good. MissionGRC is not trying to replace it. The enterprise platform is the system of record.
MissionGRC is the daily operating layer where decisions are formed, evidence is gathered, and the
narrative is shaped before it enters the system of record.

### “Markdown sounds fragile.”

Markdown is a deliberate trade-off for portability and reviewability. Records are plain text,
versionable, and readable without the app. The fragility is real at multi-writer scale, which is
why the current design supports one writable instance. A database adapter is the right next step
for larger deployments.

### “This is another tool to maintain.”

It is one Node process and one data directory. There is no database, queue, or worker. That is a
smaller operational surface than most GRC add-ons. It is still software, and it still needs
ownership, backups, patching, and TLS.

### “Can we trust the trust score?”

The score is arithmetic, not an audit opinion. It blends evidence coverage, follow-through, and
consistency. Every input is visible, and the formula is documented. If you disagree with the
weighting, change it. The point is to make the operating discipline inspectable, not to certify
control effectiveness.

### “What about security and SSO?”

The skeleton has scrypt hashing, signed HttpOnly cookies, login throttling, origin checks,
security headers, and a server-side auth gate. It does not yet have SSO, MFA, RBAC, or an audit
log. Those are prerequisites for enterprise-wide deployment, not features to hand-wave.

### “We have more than two users.”

The current workspace authenticates two demo accounts with identical access. Per-user identity,
roles, and actor-attributed history are on the roadmap. Multi-user use today assumes a trusted
team and a single shared workspace.

### “Is this AI?”

No. There is no model, no generated recommendation, and no opaque ranking. The calculations are
deterministic. For a trust product, explainability is more valuable than novelty.

### “Will it scale to thousands of records?”

Not in its current form. Each list request scans a collection directory, and there is no
pagination or index. It is designed for a small team and a focused portfolio. The repository
boundary is intentionally narrow so a database adapter can replace the storage layer later.

### “Why Angular and SSR?”

Angular provides a structured component model, route resolvers, and first-class SSR. Server
rendering gives the public login page real metadata and gives private pages a resolved first
view. Hydration with transfer caching avoids refetching the same GET data in the browser.

---

## 14. The 30-second pitch

> Most GRC teams do not lack frameworks. They lack a daily place where decisions, evidence, and
> the board narrative line up. MissionGRC is a server-rendered workspace for open items, tasks,
> decision-room meetings, third-party reviews, daily objectives, and board briefs. Everything is
> stored as readable Markdown. Its trust balance shows the arithmetic: evidence coverage,
> follow-through, and consistency. It is not another system of record. It is the calm operating
> layer that makes the system of record believable.

---

## 15. The 2-minute pitch

> Every GRC team has two lives. One is the framework: controls, policies, the register, the
> evidence. The other is the day: the meeting where a decision is made, the vendor review before
> renewal, the board pre-read due Friday.
>
> Most tools are built for the first life. The second is spread across email, spreadsheets,
> tickets, and memory. That is where trust gets thin — not because the framework is wrong, but
> because daily decisions are not visible, owned, or connected to the narrative.
>
> MissionGRC is a daily operating workspace for that second life. It brings open items, tasks,
> decision-room meetings, objectives, third-party reviews, and board briefs into one
> server-rendered Angular application. Every record is Markdown with YAML frontmatter, so the
> workspace stays readable, reviewable, and portable.
>
> The dashboard starts with intent and a trust balance. It is not a black box: 35% evidence
> coverage, 35% follow-through, 30% consistency. The inputs sit beside the score. You can see what
> is missing, overdue, or waiting on a decision.
>
> For the specialist, it removes the daily scavenger hunt and leaves a trail from meeting to
> decision to evidence to board narrative. For the executive, it turns a framework update into a
> decision request with exposure, ownership, and a date.
>
> It is not a replacement for the enterprise GRC platform, an audit opinion, an automated control
> monitor, or an AI product. It is a small, deterministic operating layer that makes the work
> behind assurance visible.
>
> If that sounds useful, start with one team, ten open items, five vendors, and one real board
> meeting. Baseline the work, use the workspace for four weeks, and compare. If the work is not
> more visible and the narrative not faster to produce, stop.

---

## 16. Discovery questions

Use these to qualify a pilot without pitching features:

1. Where does a decision get recorded today, after the meeting ends?
2. How do you know which open items have both a framework and a control documented?
3. What happens in the 48 hours before a board or steering meeting?
4. Which vendor renewal keeps you up at night, and what evidence would let you sleep?
5. Who can reconstruct the story when the lead specialist is away?
6. How many tools does the team touch to produce one status update?
7. What would make a four-week pilot clearly worth continuing?
8. What would make you stop?

The last two questions matter most. A product that makes trust visible should be willing to be
measured and stopped.

---

## 17. The next step

**Start with a four-week pilot, not a rollout.**

Bring:

- one GRC team or portfolio;
- ten open items;
- five vendor reviews;
- one upcoming board, risk committee, or steering meeting;
- a baseline for ownership, evidence, overdue work, vendor readiness, and board pre-read lead
  time.

Then use MissionGRC daily. Set intent in the morning, run real decisions through the decision
room, update the records the same day, and shape the board narrative from those records.

At the end of four weeks, compare the baseline. If the work is more visible, the decisions are
easier to trace, and the narrative is faster to produce, expand the pilot. If not, stop.

That is the offer: not a promise of compliance, but a calmer, more evidence-based way to do the
work that makes compliance believable.

---

*MissionGRC · Trust is the work.*
