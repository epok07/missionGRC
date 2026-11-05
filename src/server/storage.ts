import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import matter from 'gray-matter';

/**
 * All persistence is human-readable Markdown with YAML frontmatter.
 * Point GRC_DATA_DIR at a mounted volume to keep data outside the build output.
 */
export const dataDir = process.env['GRC_DATA_DIR']
  ? resolve(process.env['GRC_DATA_DIR'])
  : resolve(process.cwd(), 'data');

export type StoredRecord = Record<string, unknown> & { id: string; body?: string };

function safeFileName(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, '-');
}

async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

export async function listRecords<T extends { id: string }>(
  collection: string,
): Promise<Array<T & { body: string }>> {
  const folder = join(dataDir, collection);
  await ensureDir(folder);
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const records = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map(async (entry) => {
        const raw = await fs.readFile(join(folder, entry.name), 'utf8');
        const parsed = matter(raw);
        return {
          ...(parsed.data as T),
          body: parsed.content.trim(),
        };
      }),
  );
  return records;
}

export async function readRecord<T extends { id: string }>(
  collection: string,
  id: string,
): Promise<(T & { body: string }) | null> {
  try {
    const raw = await fs.readFile(join(dataDir, collection, `${safeFileName(id)}.md`), 'utf8');
    const parsed = matter(raw);
    return { ...(parsed.data as T), body: parsed.content.trim() };
  } catch {
    return null;
  }
}

/** js-yaml cannot dump undefined, and optional frontmatter fields are common. */
function compact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => compact(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, compact(item)]),
    ) as T;
  }
  return value;
}

export async function writeRecord<T extends { id: string }>(
  collection: string,
  record: T,
  body = '',
): Promise<void> {
  const folder = join(dataDir, collection);
  await ensureDir(folder);
  const target = join(folder, `${safeFileName(record.id)}.md`);
  const { body: _ignoredBody, ...frontmatter } = record as T & { body?: string };
  const serialized = matter.stringify(body.trim() ? `${body.trim()}\n` : '', compact(frontmatter));
  const temporary = join(folder, `.${safeFileName(record.id)}.${process.pid}.tmp`);
  await fs.writeFile(temporary, serialized, 'utf8');
  await fs.rename(temporary, target);
}

export async function deleteRecord(collection: string, id: string): Promise<boolean> {
  try {
    await fs.unlink(join(dataDir, collection, `${safeFileName(id)}.md`));
    return true;
  } catch {
    return false;
  }
}

export async function ensureDataDirectory(): Promise<void> {
  await ensureDir(dataDir);
  await fs.writeFile(join(dataDir, 'README.md'), DATA_README, { flag: 'wx' }).catch(() => undefined);
}

export async function replaceFile(path: string, contents: string): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await fs.writeFile(temporary, contents, 'utf8');
  await fs.rename(temporary, path);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/**
 * A deliberately small Markdown renderer. Input is escaped first so stored
 * notes can never inject HTML into an executive brief.
 */
export function renderMarkdown(markdown: string): string {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const output: string[] = [];
  let paragraph: string[] = [];
  let list: 'ul' | 'ol' | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      output.push(`</${list}>`);
      list = null;
    }
  };
  const openList = (next: 'ul' | 'ol') => {
    if (list !== next) {
      closeList();
      output.push(`<${next}>`);
      list = next;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      closeList();
      output.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      closeList();
      output.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      closeList();
      output.push(`<h2>${renderInline(trimmed.slice(2))}</h2>`);
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      openList('ul');
      output.push(`<li>${renderInline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      openList('ol');
      output.push(`<li>${renderInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return output.join('\n');
}

const DATA_README = `# MissionGRC data

Every record in this folder is a Markdown file with YAML frontmatter. The app reads
and writes these files directly, so the workspace stays portable, reviewable, and
easy to version with Git.

- \`tasks/\` — daily execution
- \`risks/\` — open items, issues, and decisions
- \`meetings/\` — decision-room calendar
- \`objectives/\` — one file per day
- \`vendors/\` — third-party risk reviews
- \`board/\` — executive and steering briefs
- \`insights.md\` — quote and question library

Delete this folder and restart the server to restore the demonstration seed.
`;
