/**
 * Builds the seed snapshot used by the browser-only GitHub Pages demo.
 *
 * The real server writes Markdown into GRC_DATA_DIR on first boot. This script
 * does the same into a temporary directory, then serialises the result as JSON
 * so the static demo can run without Node or a database.
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import type {
  BoardBrief,
  DailyPlan,
  Insight,
  Meeting,
  Objective,
  RiskItem,
  Task,
  Vendor,
} from '../src/shared/models';
import { renderMarkdown } from '../src/shared/markdown';

interface DemoSeedFile {
  generatedAt: string;
  tasks: Task[];
  risks: RiskItem[];
  meetings: Meeting[];
  vendors: Vendor[];
  board: BoardBrief[];
  objectives: DailyPlan[];
  insights: Insight[];
}

async function readCollection(collection: string): Promise<Array<Record<string, any>>> {
  const { dataDir } = await import('../src/server/storage');
  const folder = join(dataDir, collection);
  const entries = await readdir(folder, { withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const raw = await readFile(join(folder, entry.name), 'utf8');
        const parsed = matter(raw);
        return { ...(parsed.data as Record<string, any>), body: parsed.content.trim() };
      }),
  );
}

async function main(): Promise<void> {
  const temporaryDataDir = await mkdtemp(join(tmpdir(), 'missiongrc-demo-'));
  process.env['GRC_DATA_DIR'] = temporaryDataDir;

  try {
    const { seedIfEmpty } = await import('../src/server/seed');
    await seedIfEmpty();

    const [taskRecords, riskRecords, meetingRecords, vendorRecords, boardRecords, objectiveRecords, insightRecords] =
      await Promise.all([
        readCollection('tasks'),
        readCollection('risks'),
        readCollection('meetings'),
        readCollection('vendors'),
        readCollection('board'),
        readCollection('objectives'),
        readCollection('insights'),
      ]);

    const objectives: DailyPlan[] = objectiveRecords.map((record) => {
      const items = (Array.isArray(record['objectives']) ? record['objectives'] : []) as Objective[];
      const done = items.filter((objective) => objective.done).length;
      return {
        date: String(record['date'] ?? record['id']),
        intent: String(record['intent'] ?? ''),
        objectives: items,
        completion: items.length ? Math.round((done / items.length) * 100) : 0,
      };
    });

    const payload: DemoSeedFile = {
      generatedAt: new Date().toISOString(),
      tasks: taskRecords.map(({ body, ...task }) => ({ ...task, notes: body }) as Task),
      risks: riskRecords.map(({ body, ...risk }) => ({ ...risk, notes: body }) as RiskItem),
      meetings: meetingRecords.map(({ body, ...meeting }) => ({ ...meeting, notes: body }) as Meeting),
      vendors: vendorRecords.map(({ body, ...vendor }) => ({ ...vendor, notes: body }) as Vendor),
      board: boardRecords.map(({ body, ...brief }) => ({
        ...brief,
        body,
        bodyHtml: renderMarkdown(body),
      }) as BoardBrief),
      objectives,
      insights: insightRecords.map(({ body, ...insight }) => ({
        ...insight,
        text: body,
      }) as Insight),
    };

    await writeFile('public/demo-data.json', `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(
      `Wrote public/demo-data.json (${payload.tasks.length} tasks, ${payload.risks.length} open items, ${payload.insights.length} insights)`,
    );
  } finally {
    await rm(temporaryDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
