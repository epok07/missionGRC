# MissionGRC

A daily operating workspace for governance, risk, and compliance specialists: plan the day around
decisions, keep open items owned, manage third-party risk, and turn complex risk into board-ready
narratives.

**Live proof-of-concept demo:** <https://epok07.github.io/missionGRC/>

The public demo is a static, browser-only build. Sign in with either demo account:

| Username | Password        | Profile        |
| -------- | --------------- | -------------- |
| `admin`  | `Dare2Hack$`    | Alex Morgan    |
| `ki`     | `Dare2ImpressU` | Ki             |

Demo edits are stored in your browser's `localStorage`; nothing is sent to a server.

## How the deployment works

GitHub Pages can only serve static files, so it cannot run the Express/SSR server. The
`deploy-pages.yml` workflow therefore builds a client-rendered version of the same Angular app:

- `npm run demo:data` seeds the real server's demo workspace into a temporary folder and serialises
  it to `public/demo-data.json`.
- The `demo` build configuration replaces the HTTP layer with an in-browser API
  (`src/app/core/demo/`) and renders every route on the client.
- Dated demo data is shifted to the visitor's current day, so the demo keeps working even when the
  last deployment was months ago.
- The workflow publishes `dist/mission-grc/browser` to GitHub Pages. A monthly schedule refreshes
  the snapshot.

The real Express server remains unchanged for local or server deployments.

## Local development

```bash
npm install
npm start
```

Open <http://localhost:4200/>. The first server start seeds the Markdown workspace in `data/`.
Sign in with the demo accounts above.

### Run the public demo build locally

```bash
npm run build:demo
cp dist/mission-grc/browser/index.csr.html dist/mission-grc/browser/index.html
cp dist/mission-grc/browser/index.csr.html dist/mission-grc/browser/404.html
# Serve dist/mission-grc/browser at the path /missionGRC/ (any static server with SPA fallback).
```

`npm run demo:data` alone regenerates `public/demo-data.json` from the server seed.

## Production-style Node server

```bash
npm run build
GRC_DATA_DIR=/var/lib/missiongrc PORT=4000 npm run serve:ssr:mission-grc
```

Environment variables:

| Variable           | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `PORT`             | HTTP port (default `4000`).                                     |
| `GRC_DATA_DIR`     | Directory for the Markdown workspace (default `./data`).        |
| `SESSION_SECRET`   | HMAC secret for signed session cookies. Set this in production. |
| `NG_ALLOWED_HOSTS` | Comma-separated extra Host headers accepted by Angular SSR.     |
| `PUBLIC_ORIGIN`    | Public origin used for sitemap URLs and allowed hosts.          |

The `ci.yml` workflow builds this server and smoke-tests `/login` on every push.

## Build and test

```bash
npm run build     # Express/SSR production build
npm run build:demo # static GitHub Pages build
npm test          # Karma unit tests
```

## Data model

The workspace is plain Markdown with YAML frontmatter. Each record is a file under `data/`:
tasks, risks/issues/decisions, meetings, daily objectives, vendors, and board briefs. The browser
demo mirrors the same records in `public/demo-data.json` and persists changes locally.

## License

See [LICENSE.md](LICENSE.md).
