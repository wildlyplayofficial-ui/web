/**
 * R9: Track AI/social job failures and surface them via TG alert.
 * Jobs register failures here; dl-monitor reads and alerts.
 */
import { log } from './log';

interface JobFailure {
  job: string;   // e.g. "preview", "recap", "translate", "facebook", "telegram", "revalidate"
  pickId?: string;
  detail: string;
  ts: number;
}

const failures: JobFailure[] = [];
const MAX_AGE = 30 * 60 * 1000; // 30 min retention

/** Record a job failure. Called from fire-and-forget pipelines. */
export function trackFailure(job: string, detail: string, pickId?: string) {
  failures.push({ job, detail, pickId, ts: Date.now() });
  log.warn(`job-tracker: ${job} failed${pickId ? ` (pick ${pickId})` : ''}: ${detail}`);
}

/** Get recent failures and clear them. Called by dl-monitor. */
export function drainFailures(): JobFailure[] {
  const now = Date.now();
  // Prune old
  const recent = failures.filter((f) => now - f.ts < MAX_AGE);
  failures.length = 0;
  return recent;
}

/** Format failures into a TG alert message. Returns null if no failures. */
export function formatFailureAlert(drained: JobFailure[]): string | null {
  if (drained.length === 0) return null;

  const byJob = new Map<string, JobFailure[]>();
  for (const f of drained) {
    const list = byJob.get(f.job) ?? [];
    list.push(f);
    byJob.set(f.job, list);
  }

  const lines = ['⚠️ <b>Job failures (last 30 min)</b>'];
  for (const [job, items] of byJob) {
    lines.push(`\n<b>${job}</b> (${items.length}):`);
    for (const f of items.slice(0, 3)) {
      const pick = f.pickId ? ` [${f.pickId.slice(0, 8)}]` : '';
      lines.push(`  • ${f.detail.slice(0, 100)}${pick}`);
    }
    if (items.length > 3) lines.push(`  … +${items.length - 3} more`);
  }
  return lines.join('\n');
}
