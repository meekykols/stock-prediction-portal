import { JobRun } from '../models/index.js';
import { ApiError } from './ApiError.js';

const running = new Set(); // one run per job per process

export const isRunning = (job) => running.has(job);

/**
 * Records a background job in JobRun. `work(run)` increments run.created / run.failed and
 * pushes to run.errors; it may return { skipped, note }. `onFinish(run)` runs after saving.
 */
export async function runJob(job, { trigger = 'schedule', triggeredBy } = {}, work, { onFinish } = {}) {
  if (running.has(job)) throw ApiError.conflict('That job is already running');
  running.add(job);
  const run = await JobRun.create({ job, trigger, triggeredBy });
  try {
    const outcome = (await work(run)) || {};
    run.status = outcome.skipped ? 'skipped' : run.failed && !run.created ? 'failed' : run.failed ? 'partial' : 'success';
    run.note = outcome.note;
  } catch (err) {
    run.status = 'failed';
    run.errors.push(err.message);
  } finally {
    run.errors = run.errors.slice(0, 50);
    run.finishedAt = new Date();
    await run.save();
    running.delete(job);
  }
  await onFinish?.(run);
  console.log(`[jobs] ${job} ${run.status}: ${run.created} created, ${run.failed} failed`);
  return run;
}
