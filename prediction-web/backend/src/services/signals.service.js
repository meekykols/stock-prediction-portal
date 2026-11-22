import { JobRun, Signal, SignalConfig } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { mlService } from './ml.service.js';
import { getCurrentEntitlement } from './subscription.service.js';
import { emitTo, ROOMS } from '../socket/index.js';

const todayUtc = () => new Date().toISOString().slice(0, 10);
const running = new Set(); // one run per job per process

// ---------------------------------------------------------------- shaping

const CLASS_LABEL = { stock: 'Stock', forex: 'Forex', commodity: 'Commodity', crypto: 'Crypto' };

function marketSignal(r, runDate) {
  return {
    type: 'market',
    assetClass: r.assetClass,
    key: r.symbol,
    runDate,
    title: r.displayName,
    subtitle: `${CLASS_LABEL[r.assetClass]} · ${r.outlook.horizonDays}-day outlook`,
    strength: Math.abs(r.outlook.changePct),
    summary: {
      assetClass: r.assetClass,
      symbol: r.symbol,
      displayName: r.displayName,
      unit: r.unit,
      currency: r.currency,
      lastClose: r.lastClose,
      targetPrice: r.outlook.targetPrice,
      changePct: r.outlook.changePct,
      direction: r.outlook.direction,
      horizonDays: r.outlook.horizonDays,
      directionalAccuracy: r.metrics.directionalAccuracy,
      r2: r.metrics.r2,
    },
    result: r,
  };
}

function sportsSignal(r, runDate) {
  const { fixture, prediction } = r;
  return {
    type: 'sports',
    key: String(fixture.id),
    runDate,
    title: `${fixture.home.name} vs ${fixture.away.name}`,
    subtitle: fixture.league?.name,
    strength: Math.round(prediction.pick.probability * 100),
    summary: {
      kickoff: fixture.kickoff,
      league: fixture.league?.name,
      leagueLogo: fixture.league?.logo,
      home: fixture.home.name,
      away: fixture.away.name,
      homeLogo: fixture.home.logo,
      awayLogo: fixture.away.logo,
      pick: prediction.pick,
      probabilities: prediction.probabilities,
      expectedGoals: prediction.expectedGoals,
      over25: prediction.markets.over25,
      confidence: prediction.confidence,
    },
    result: r,
  };
}

async function save(signal) {
  await Signal.findOneAndUpdate(
    { type: signal.type, key: signal.key, runDate: signal.runDate },
    signal,
    { upsert: true, setDefaultsOnInsert: true },
  );
}

// ---------------------------------------------------------------- runs

async function runJob(job, { trigger = 'schedule', triggeredBy } = {}, work) {
  if (running.has(job)) throw ApiError.conflict('That job is already running');
  running.add(job);
  const run = await JobRun.create({ job, trigger, triggeredBy });
  try {
    const outcome = await work(run);
    run.status = outcome.skipped ? 'skipped' : run.failed && !run.created ? 'failed' : run.failed ? 'partial' : 'success';
    run.note = outcome.note;
  } catch (err) {
    run.status = 'failed';
    run.errors.push(err.message);
  } finally {
    run.finishedAt = new Date();
    await run.save();
    running.delete(job);
  }
  if (run.created) emitTo(ROOMS.premium, 'signals:new', { job, count: run.created, runDate: todayUtc() });
  console.log(`[signals] ${job} ${run.status}: ${run.created} created, ${run.failed} failed`);
  return run;
}

const isWeekend = (d = new Date()) => [0, 6].includes(d.getUTCDay());

/**
 * Weekdays: every market on the watchlist. Weekends: crypto only (other markets are closed,
 * so their data hasn't changed).
 */
export async function runMarketSignals(opts = {}) {
  return runJob('market-signals', opts, async (run) => {
    const config = await SignalConfig.getSingleton();
    if (!config.enabled || !config.markets.enabled) return { skipped: true, note: 'Market signals are turned off' };
    const weekend = isWeekend();
    const classes = weekend && opts.trigger !== 'manual' ? ['crypto'] : ['stock', 'forex', 'commodity', 'crypto'];
    const runDate = todayUtc();
    const { watchlist, horizon } = config.markets;
    for (const assetClass of classes) {
      for (const symbol of watchlist[assetClass] || []) {
        try {
          const result = await mlService.predictMarket({ assetClass, symbol, horizon });
          await save(marketSignal(result, runDate));
          run.created += 1;
        } catch (err) {
          run.failed += 1;
          run.errors.push(`${symbol}: ${err.message}`);
        }
      }
    }
    return weekend && opts.trigger !== 'manual' ? { note: 'Weekend run: crypto only' } : {};
  });
}

const UPCOMING = new Set(['NS', 'TBD']);

export async function runSportsSignals(opts) {
  return runJob('sports-signals', opts, async (run) => {
    const config = await SignalConfig.getSingleton();
    if (!config.enabled || !config.sports.enabled) return { skipped: true, note: 'Sports signals are turned off' };
    const runDate = todayUtc();
    let fixtures;
    try {
      ({ fixtures } = await mlService.sportsFixtures(runDate));
    } catch (err) {
      if (err.errorCode === 'not_configured') return { skipped: true, note: 'Sports data is not configured (API_FOOTBALL_KEY)' };
      throw err;
    }
    const picks = fixtures.filter((f) => UPCOMING.has(f.status?.short)).slice(0, config.sports.maxPerRun);
    if (!picks.length) return { note: 'No upcoming fixtures in tracked leagues today' };
    for (const f of picks) {
      try {
        const result = await mlService.predictSports({ fixtureId: f.id });
        await save(sportsSignal(result, runDate));
        run.created += 1;
      } catch (err) {
        run.failed += 1;
        run.errors.push(`${f.home?.name} vs ${f.away?.name}: ${err.message}`);
      }
    }
    return {};
  });
}

export const isRunning = (job) => running.has(job);

// ---------------------------------------------------------------- feed

const LOCKED_FIELDS = ['pick', 'probabilities', 'expectedGoals', 'over25', 'targetPrice', 'changePct', 'direction', 'confidence'];

function lock(signal) {
  const json = signal.toJSON();
  const summary = { ...json.summary };
  for (const f of LOCKED_FIELDS) delete summary[f];
  delete summary.lastClose; // keeps the instrument visible, not the numbers
  return { ...json, summary, strength: undefined, locked: true };
}

export async function feed(userId, { date, type } = {}) {
  const { plan } = await getCurrentEntitlement(userId);
  const entitled = Boolean(plan?.limits?.premiumSignals);
  const dates = await Signal.distinct('runDate');
  const recent = dates.sort().reverse().slice(0, 14);
  const runDate = date && recent.includes(date) ? date : recent[0];
  if (!runDate) return { entitled, date: null, dates: [], items: [] };

  const filter = { runDate, ...(type && { type }) };
  const items = await Signal.find(filter).sort({ type: 1, strength: -1 });
  return { entitled, date: runDate, dates: recent, items: entitled ? items : items.map(lock) };
}

export async function signalDetail(userId, id) {
  const { plan } = await getCurrentEntitlement(userId);
  if (!plan?.limits?.premiumSignals) {
    throw new ApiError(403, 'Premium signals are included in Pro and Elite plans.', undefined, 'premium_required');
  }
  const signal = await Signal.findById(id).select('+result');
  if (!signal) throw ApiError.notFound('Signal not found');
  return signal;
}
