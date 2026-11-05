import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { UserSummary } from '../shared/models';

export const SESSION_COOKIE = 'grc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_SECRET =
  process.env['SESSION_SECRET'] ?? 'mission-grc-local-dev-secret-change-before-production';

interface AccountRecord extends UserSummary {
  salt: string;
  hash: string;
}

/**
 * Default demo accounts. Passwords are stored as scrypt hashes, never as plain text.
 * Credentials are documented in README.md for the local skeleton.
 */
const ACCOUNTS: Record<string, AccountRecord> = {
  admin: {
    username: 'admin',
    name: 'Alex Morgan',
    role: 'GRC Lead',
    initials: 'AM',
    focus: 'Make risk decisions visible, intentional, and owned.',
    salt: '5473bca04bc1186c83e22a1d37f6c945',
    hash: '559e2ab363c4101b73c81657df65efc0313b6e39d85f85a8bc286657067db7b45fbb0bda8805cebbacb41d261c52ce5624f6e56d2b4c052b26c7c76f199a7e9f',
  },
  ki: {
    username: 'ki',
    name: 'Ki',
    role: 'GRC Specialist',
    initials: 'KI',
    focus: 'Build trust through consistency, one documented decision at a time.',
    salt: '5602d94b880baf082e9dff58abad3996',
    hash: '63ff51b7ad98b3050892426249ddbfed2391e3347e018aa0ba0c6b79c2c4da09291b97938f251b0ba0f8854fc136b5ccafd6e3e874964575cdf0ab94fa493208',
  },
};

interface SessionPayload {
  sub: string;
  name: string;
  role: string;
  initials: string;
  focus: string;
  iat: number;
  exp: number;
}

function toSummary(account: AccountRecord): UserSummary {
  const { username, name, role, initials, focus } = account;
  return { username, name, role, initials, focus };
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function verifyCredentials(username: string, password: string): UserSummary | null {
  const normalized = username.trim().toLowerCase();
  const account = ACCOUNTS[normalized];
  if (!account) {
    // Perform a dummy derivation to keep the response time broadly consistent.
    scryptSync(password, 'missing-account', 64);
    return null;
  }

  const candidate = scryptSync(password, account.salt, 64).toString('hex');
  return safeEqual(candidate, account.hash) ? toSummary(account) : null;
}

function sign(value: string): string {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

export function createSessionToken(user: UserSummary): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.username,
    name: user.name,
    role: user.role,
    initials: user.initials,
    focus: user.focus,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(token: string | undefined): UserSummary | null {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature || !safeEqual(sign(encoded), signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SessionPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!ACCOUNTS[payload.sub]) return null;
    return {
      username: payload.sub,
      name: payload.name,
      role: payload.role,
      initials: payload.initials,
      focus: payload.focus,
    };
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) return cookies;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

export function getSessionUser(req: Request): UserSummary | null {
  const cookies = parseCookies(req.headers.cookie);
  return readSessionToken(cookies[SESSION_COOKIE]);
}

export function setSessionCookie(req: Request, res: Response, user: UserSummary): void {
  res.cookie(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
}

export function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  res.locals['user'] = user;
  next();
}
