import { Router, type Request, type Response, type NextFunction } from 'express';
import type {
  BoardDraft,
  MeetingDraft,
  ObjectiveCategory,
  ObjectiveDraft,
  RiskDraft,
  TaskDraft,
  TaskStatus,
  UserSummary,
} from '../shared/models';
import {
  clearSessionCookie,
  getSessionUser,
  requireApiAuth,
  setSessionCookie,
  verifyCredentials,
} from './auth';
import {
  addObjective,
  createMeeting,
  createRisk,
  createTask,
  getDashboard,
  getObjectiveHistory,
  getPlan,
  listBoardBriefs,
  listInsights,
  listMeetings,
  listRisks,
  listTasks,
  listVendors,
  removeMeeting,
  removeObjective,
  removeTask,
  setPlanIntent,
  updateBoardBrief,
  updateObjective,
  updateRisk,
  updateTask,
  updateVendor,
} from './repository';

const router = Router();

type AsyncRoute = (req: Request, res: Response) => Promise<void>;

function handle(route: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void route(req, res).catch(next);
  };
}

function currentUser(res: Response): UserSummary {
  return res.locals['user'] as UserSummary;
}

/* ------------------------------------------------------- request hardening */

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_LIMIT = 10;

function loginKey(req: Request, username: string): string {
  return `${req.ip ?? 'unknown'}:${username.toLowerCase()}`;
}

function loginBlocked(key: string): boolean {
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (attempt.resetAt <= Date.now()) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= LOGIN_LIMIT;
}

function registerFailure(key: string): void {
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= Date.now()) {
    loginAttempts.set(key, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
    return;
  }
  attempt.count += 1;
}

router.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const origin = req.headers.origin;
  if (origin) {
    const allowed = `${req.protocol}://${req.get('host')}`;
    if (origin !== allowed) {
      res.status(403).json({ error: 'Cross-origin request blocked.' });
      return;
    }
  }
  next();
});

/* -------------------------------------------------------------------- auth */

router.post(
  '/auth/login',
  handle(async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const key = loginKey(req, username);
    if (loginBlocked(key)) {
      res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
      return;
    }

    const user = verifyCredentials(username, password);
    if (!user) {
      registerFailure(key);
      res.status(401).json({ error: 'Those credentials do not match a workspace account.' });
      return;
    }

    loginAttempts.delete(key);
    setSessionCookie(req, res, user);
    res.json({ user });
  }),
);

router.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/auth/me', requireApiAuth, (_req, res) => {
  res.json({ user: currentUser(res) });
});

/* --------------------------------------------------------------- workspace */

router.use(requireApiAuth);

router.get(
  '/dashboard',
  handle(async (_req, res) => {
    res.json(await getDashboard(currentUser(res)));
  }),
);

router.get(
  '/tasks',
  handle(async (_req, res) => {
    res.json(await listTasks());
  }),
);

router.post(
  '/tasks',
  handle(async (req, res) => {
    const draft = req.body as TaskDraft;
    if (!draft?.title?.trim()) {
      res.status(400).json({ error: 'A task title is required.' });
      return;
    }
    res.status(201).json(await createTask(draft, currentUser(res).name));
  }),
);

router.patch(
  '/tasks/:id',
  handle(async (req, res) => {
    const task = await updateTask(param(req, 'id'), {
      ...(req.body as Partial<TaskDraft>),
      status: req.body?.status as TaskStatus | undefined,
    });
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.json(task);
  }),
);

router.delete(
  '/tasks/:id',
  handle(async (req, res) => {
    const removed = await removeTask(param(req, 'id'));
    res.status(removed ? 200 : 404).json(removed ? { ok: true } : { error: 'Task not found.' });
  }),
);

router.get(
  '/risks',
  handle(async (_req, res) => {
    res.json(await listRisks());
  }),
);

router.post(
  '/risks',
  handle(async (req, res) => {
    const draft = req.body as RiskDraft;
    if (!draft?.title?.trim()) {
      res.status(400).json({ error: 'A title is required.' });
      return;
    }
    res.status(201).json(await createRisk(draft, currentUser(res).name));
  }),
);

router.patch(
  '/risks/:id',
  handle(async (req, res) => {
    const risk = await updateRisk(param(req, 'id'), {
      status: req.body?.status,
      owner: req.body?.owner,
      due: req.body?.due,
      notes: req.body?.notes,
    });
    if (!risk) {
      res.status(404).json({ error: 'Open item not found.' });
      return;
    }
    res.json(risk);
  }),
);

router.get(
  '/meetings',
  handle(async (req, res) => {
    const from = typeof req.query['from'] === 'string' ? req.query['from'] : undefined;
    const to = typeof req.query['to'] === 'string' ? req.query['to'] : undefined;
    res.json(await listMeetings(from, to));
  }),
);

router.post(
  '/meetings',
  handle(async (req, res) => {
    const draft = req.body as MeetingDraft;
    if (!draft?.title?.trim() || !draft?.date) {
      res.status(400).json({ error: 'A title and date are required.' });
      return;
    }
    res.status(201).json(await createMeeting(draft, currentUser(res).name));
  }),
);

router.delete(
  '/meetings/:id',
  handle(async (req, res) => {
    const removed = await removeMeeting(param(req, 'id'));
    res
      .status(removed ? 200 : 404)
      .json(removed ? { ok: true } : { error: 'Meeting not found.' });
  }),
);

router.get(
  '/vendors',
  handle(async (_req, res) => {
    res.json(await listVendors());
  }),
);

router.patch(
  '/vendors/:id',
  handle(async (req, res) => {
    const vendor = await updateVendor(param(req, 'id'), {
      status: req.body?.status,
      progress: req.body?.progress,
      reviewDue: req.body?.reviewDue,
      notes: req.body?.notes,
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found.' });
      return;
    }
    res.json(vendor);
  }),
);

router.get(
  '/board',
  handle(async (_req, res) => {
    res.json(await listBoardBriefs());
  }),
);

router.patch(
  '/board/:id',
  handle(async (req, res) => {
    const brief = await updateBoardBrief(param(req, 'id'), req.body as BoardDraft);
    if (!brief) {
      res.status(404).json({ error: 'Brief not found.' });
      return;
    }
    res.json(brief);
  }),
);

router.get(
  '/objectives/history',
  handle(async (req, res) => {
    const requested = Number(req.query['days'] ?? 14);
    const days = Number.isFinite(requested) ? Math.max(1, Math.min(60, Math.round(requested))) : 14;
    res.json(await getObjectiveHistory(days));
  }),
);

router.get(
  '/objectives',
  handle(async (req, res) => {
    const date = typeof req.query['date'] === 'string' ? req.query['date'] : undefined;
    res.json(await getPlan(date));
  }),
);

router.patch(
  '/objectives/:date/intent',
  handle(async (req, res) => {
    if (typeof req.body?.intent !== 'string') {
      res.status(400).json({ error: 'An intent is required.' });
      return;
    }
    res.json(await setPlanIntent(param(req, 'date'), req.body.intent));
  }),
);

router.post(
  '/objectives/:date/objectives',
  handle(async (req, res) => {
    const draft = req.body as ObjectiveDraft;
    if (!draft?.text?.trim()) {
      res.status(400).json({ error: 'Objective text is required.' });
      return;
    }
    res.status(201).json(await addObjective(param(req, 'date'), draft));
  }),
);

router.patch(
  '/objectives/:date/objectives/:id',
  handle(async (req, res) => {
    res.json(
      await updateObjective(param(req, 'date'), param(req, 'id'), {
        done: typeof req.body?.done === 'boolean' ? req.body.done : undefined,
        text: typeof req.body?.text === 'string' ? req.body.text : undefined,
        category:
          typeof req.body?.category === 'string'
            ? (req.body.category as ObjectiveCategory)
            : undefined,
      }),
    );
  }),
);

router.delete(
  '/objectives/:date/objectives/:id',
  handle(async (req, res) => {
    res.json(await removeObjective(param(req, 'date'), param(req, 'id')));
  }),
);

router.get(
  '/insights',
  handle(async (_req, res) => {
    res.json(await listInsights());
  }),
);

router.get('/session', (req, res) => {
  res.json({ user: getSessionUser(req) });
});

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? '') : value;
}

export const apiRouter = router;
