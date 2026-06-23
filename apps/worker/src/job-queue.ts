/** Durable job queue backed by Supabase `job_queue` table. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

export type JobType = 'watching-news' | 'note-translate' | 'postmortem' | 'postmortem-article' | 'noplay-article' | 'analysis';
export type JobHandler = (payload: unknown) => Promise<void>;
export type HandlerMap = Record<string, JobHandler>;

interface JobRow {
  id: string;
  type: string;
  payload: unknown;
  status: string;
  attempts: number;
  max_attempts: number;
}

/** Insert a pending job. Returns the job id. */
export async function enqueueJob(
  sb: SupabaseClient,
  type: JobType,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await sb
    .from('job_queue')
    .insert({ type, payload, status: 'pending' })
    .select('id')
    .single();
  if (error) throw new Error(`enqueueJob failed: ${error.message}`);
  log.info(`job-queue: enqueued ${type} → ${data.id}`);
  return data.id;
}

/**
 * Pick up pending jobs and execute them one at a time.
 * Never throws — errors are logged and the job is marked 'failed'.
 */
export async function processJobs(sb: SupabaseClient, handlers: HandlerMap): Promise<void> {
  const { data: jobs, error } = await sb
    .from('job_queue')
    .select('id, type, payload, status, attempts, max_attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    log.warn(`job-queue: fetch failed: ${error.message}`);
    return;
  }
  if (!jobs || jobs.length === 0) return;

  for (const job of jobs as JobRow[]) {
    if (job.attempts >= job.max_attempts) {
      await sb.from('job_queue').update({ status: 'failed', error: 'max attempts exceeded' }).eq('id', job.id);
      continue;
    }

    const handler = handlers[job.type];
    if (!handler) {
      log.warn(`job-queue: no handler for type "${job.type}", skipping ${job.id}`);
      continue;
    }

    // Claim the job
    await sb.from('job_queue').update({
      status: 'running',
      attempts: job.attempts + 1,
      started_at: new Date().toISOString(),
    }).eq('id', job.id);

    try {
      await handler(job.payload);
      await sb.from('job_queue').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', job.id);
      log.info(`job-queue: completed ${job.type} ${job.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`job-queue: ${job.type} ${job.id} failed: ${msg}`);
      await sb.from('job_queue').update({
        status: 'failed',
        error: msg,
      }).eq('id', job.id);
    }
  }
}

/**
 * Reset jobs stuck in 'running' for >5 min back to 'pending'.
 * Call on boot to recover from crashes.
 */
export async function retryStaleJobs(sb: SupabaseClient): Promise<void> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data, error } = await sb
    .from('job_queue')
    .update({ status: 'pending' })
    .eq('status', 'running')
    .lt('started_at', fiveMinAgo)
    .select('id, type');

  if (error) {
    log.warn(`job-queue: retryStaleJobs failed: ${error.message}`);
    return;
  }
  if (data && data.length > 0) {
    log.info(`job-queue: recovered ${data.length} stale job(s): ${data.map((j) => j.type).join(', ')}`);
  }
}
