import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { apiRouter } from './server/api';
import { getSessionUser } from './server/auth';
import { seedIfEmpty } from './server/seed';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/** Angular SSR rejects unknown Host headers to prevent SSRF. */
function allowedHosts(): string[] {
  const configured = process.env['NG_ALLOWED_HOSTS'];
  if (configured) {
    return configured
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean);
  }
  const hosts = new Set(['localhost', '127.0.0.1', '192.168.1.233', '192.168.1.34', '172.18.0.1', '172.17.0.1']);
  const origin = process.env['PUBLIC_ORIGIN'];
  if (origin) {
    try {
      hosts.add(new URL(origin).hostname);
    } catch {
      // Ignore a malformed PUBLIC_ORIGIN; the fallback hosts still work locally.
    }
  }
  return [...hosts];
}

const angularApp = new AngularNodeAppEngine({ allowedHosts: allowedHosts() });

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '256kb' }));

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /api/\n');
});

app.get('/sitemap.xml', (req, res) => {
  const origin = process.env['PUBLIC_ORIGIN'] ?? `${req.protocol}://${req.get('host')}`;
  const urls = ['/login'].map(
    (path) => `  <url><loc>${origin}${path}</loc><changefreq>monthly</changefreq></url>`,
  );
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    );
});

app.use('/api', apiRouter);

app.use('/api', (_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api]', _error);
  res.status(500).json({ error: 'Something went wrong while reading the workspace.' });
});

/**
 * Serve the built browser bundle before auth checks so public assets stay cheap.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Direct browser hits to protected pages are redirected before SSR. Client-side
 * navigation is still guarded by the Angular route guard.
 */
const PUBLIC_PATHS = new Set(['/login', '/robots.txt', '/sitemap.xml', '/favicon.ico']);

app.use((req, res, next) => {
  const isDocument = req.method === 'GET' || req.method === 'HEAD';
  const isPublic = PUBLIC_PATHS.has(req.path) || req.path.startsWith('/login/');
  if (!isDocument || !req.accepts('html') || isPublic) {
    next();
    return;
  }
  if (getSessionUser(req)) {
    next();
    return;
  }
  const returnTo = encodeURIComponent(req.originalUrl);
  res.redirect(302, `/login?returnTo=${returnTo}`);
});

/**
 * Render the Angular application for every remaining route.
 */
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

await seedIfEmpty();

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`MissionGRC listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
