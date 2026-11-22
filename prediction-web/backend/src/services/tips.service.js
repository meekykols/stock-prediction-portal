import { Tip, TipsConfig } from '../models/index.js';
import { RESULT_AFTER_MS, SPORTS } from '../constants/sports.js';
import { mlService } from './ml.service.js';
import { getCurrentEntitlement } from './subscription.service.js';
import { runJob } from '../utils/jobRunner.js';
import { ApiError } from '../utils/ApiError.js';
import { marketOutcome } from '../utils/sportsMarkets.js';
import { settleCodes } from './codes.service.js';
import { settleSlips } from './contest.service.js';

const DAY = 86400e3;
const GIVE_UP_AFTER_MS = 72 * 3600e3; // no final result after this → void
const RESULTS_WINDOW_DAYS = 7; // the ML service only serves results this far back
const CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 };

const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);
const addDays = (date, n) => utcDate(new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY));

// ---------------------------------------------------------------- settlement

/**
 * Settle one tip against the provider's event. Returns the new `result`, or null when the
 * event isn't decided yet. Pure, so it's unit-tested directly.
 */
export function evaluateTip(tip, event) {
  const state = event?.status?.state;
  if (state === 'void') return { state: 'void', note: event.status.long || 'Postponed or cancelled' };
  if (state !== 'finished') return null;

  const { pick, markets = [] } = tip.prediction;
  const result = {
    score: event.score ?? null,
    winner: event.winner ?? null,
    markets: markets.map((m) => {
      const actual = marketOutcome(m, event.score);
      return { key: m.key, line: m.line, outcome: m.outcome, won: actual == null ? null : actual === m.outcome };
    }),
  };
  if (!event.winner) return { ...result, state: 'void', note: 'No winner recorded' };
  if (event.winner === 'draw' && pick.market === 'winner') return { ...result, state: 'void', note: 'Tie: winner tips are void' };
  const verdict = event.winner === pick.outcome ? 'won' : 'lost';
  return { ...result, state: verdict, returns: tipReturns(tip.prediction, event.winner, verdict) };
}

const unitReturn = (won, odds) => (odds ? Math.round((won ? odds - 1 : -1) * 1000) / 1000 : undefined);

/** Profit per 1-unit stake on the pick and on any value selection, at the consensus price. */
export function tipReturns(prediction, winner, state) {
  const out = {};
  if (prediction.pick?.odds) out.pick = unitReturn(state === 'won', prediction.pick.odds);
  if (prediction.value?.odds) out.value = unitReturn(prediction.value.outcome === winner, prediction.value.odds);
  return Object.keys(out).length ? out : undefined;
}

export function settleTips(opts = {}) {
  return runJob('tips-settle', opts, async (run) => {
    const now = Date.now();
    const minWait = Math.min(...Object.values(RESULT_AFTER_MS));
    const pending = await Tip.find({ 'result.state': 'pending', kickoff: { $lte: new Date(now - minWait) } });
    const due = pending.filter((t) => t.kickoff.getTime() + RESULT_AFTER_MS[t.sport] <= now);
    if (!due.length) {
      // A manual tip correction may have decided a code or a slip.
      const codes = await settleCodes();
      const slips = await settleSlips();
      const extra = [codes && `${codes} booking code(s)`, slips && `${slips} contest slip(s)`].filter(Boolean);
      return { note: extra.length ? `Settled ${extra.join(', ')}` : 'Nothing to settle' };
    }

    const groups = new Map();
    for (const t of due) {
      const k = `${t.sport}|${t.date}`;
      groups.set(k, [...(groups.get(k) || []), t]);
    }

    const voidTip = async (t, note) => {
      t.result = { state: 'void', note, settledAt: new Date() };
      await t.save();
      run.created += 1;
    };

    for (const [k, tips] of groups) {
      const [sport, date] = k.split('|');
      if (date < addDays(utcDate(), -RESULTS_WINDOW_DAYS + 1)) {
        for (const t of tips) await voidTip(t, 'No final result was available');
        continue;
      }
      let events;
      try {
        ({ events } = await mlService.sportsEvents({ sport, date }));
      } catch (err) {
        run.failed += tips.length;
        run.errors.push(`${sport} ${date}: ${err.message}`);
        continue;
      }
      const byId = new Map(events.map((e) => [e.id, e]));
      for (const t of tips) {
        const event = byId.get(t.eventId);
        const result = event ? evaluateTip(t, event) : null;
        if (event) t.status = event.status;
        if (result) {
          t.result = { ...result, settledAt: new Date() };
          await t.save();
          run.created += 1;
        } else if (now - t.kickoff.getTime() > GIVE_UP_AFTER_MS) {
          await voidTip(t, event ? 'No final result after 72 hours' : 'Event no longer listed by the data provider');
        } else if (event) {
          await t.save(); // keep the live status fresh
        }
      }
    }
    const codes = await settleCodes();
    const slips = await settleSlips();
    const extra = [codes && `${codes} booking code(s)`, slips && `${slips} contest slip(s)`].filter(Boolean);
    return { note: `${run.created} tips settled${extra.length ? `; also ${extra.join(', ')}` : ''}` };
  });
}

// ---------------------------------------------------------------- generation

async function saveTip(sport, { event, prediction, model }, fallbackModel, config) {
  const existing = await Tip.findOne({ sport, eventId: event.id }).select('kickoff result.state');
  // Tips are frozen once the event has started (or been settled), so the record can't be edited after the fact.
  if (existing && (existing.kickoff <= new Date() || existing.result?.state !== 'pending')) return 'frozen';
  await Tip.updateOne(
    { sport, eventId: event.id },
    {
      $set: {
        date: event.date,
        kickoff: new Date(event.kickoff),
        league: event.league,
        home: event.home,
        away: event.away,
        extra: event.extra || {},
        status: event.status,
        model: model || fallbackModel,
        prediction,
        featured: CONFIDENCE_RANK[prediction.confidence] >= CONFIDENCE_RANK[config.featuredConfidence],
        generatedAt: new Date(),
      },
      $setOnInsert: { 'result.state': 'pending' },
    },
    { upsert: true },
  );
  return existing ? 'updated' : 'created';
}

/** Today's and tomorrow's tips for every enabled sport. Safe to re-run: it refreshes unstarted tips. */
export function generateTips(opts = {}) {
  return runJob('sports-tips', opts, async (run) => {
    const config = await TipsConfig.getSingleton();
    if (!config.enabled) return { skipped: true, note: 'Sports tips are turned off' };
    const dates = [utcDate(), addDays(utcDate(), 1)];
    let updated = 0;
    for (const sport of SPORTS) {
      const sc = config.sports[sport];
      if (!sc?.enabled) continue;
      if (sport !== 'mma' && !sc.leagues.length) {
        run.errors.push(`${sport}: no leagues selected`);
        continue;
      }
      for (const date of dates) {
        let data;
        try {
          const odds = config.odds?.enabled
            ? { weight: config.odds.marketWeight, max: config.odds.maxCallsPerRun, valueEdge: config.odds.valueEdge }
            : null;
          data = await mlService.sportsTips({ sport, date, leagues: sc.leagues, odds });
        } catch (err) {
          run.failed += 1;
          run.errors.push(`${sport} ${date}: ${err.message}`);
          if (err.errorCode === 'not_configured') return { skipped: true, note: 'Sports data is not configured (API_FOOTBALL_KEY)' };
          continue;
        }
        for (const tip of data.tips) {
          const outcome = await saveTip(sport, tip, data.model, config);
          if (outcome === 'created') run.created += 1;
          if (outcome === 'updated') updated += 1;
        }
        for (const s of data.skipped) {
          run.failed += s.events;
          const msg = `${sport}: ${s.league?.name} (${s.events} event${s.events === 1 ? '' : 's'}): ${s.reason}`;
          if (!run.errors.includes(msg)) run.errors.push(msg);
        }
      }
    }
    return { note: `${run.created} new, ${updated} refreshed` };
  });
}

// ---------------------------------------------------------------- reading

export async function hasFullAccess(userId, config) {
  if (!userId) return false;
  const { plan } = await getCurrentEntitlement(userId);
  return Boolean(plan && config.fullAccessPlans.includes(plan.slug));
}

function lockTip(json) {
  const { prediction, ...rest } = json;
  return { ...rest, prediction: { confidence: prediction?.confidence }, locked: true };
}

export async function trackRecord({ days = 30, sport } = {}) {
  const since = addDays(utcDate(), -days);
  const rows = await Tip.aggregate([
    { $match: { date: { $gte: since }, 'result.state': { $in: ['won', 'lost'] }, ...(sport && { sport }) } },
    {
      $group: {
        _id: { sport: '$sport', featured: '$featured' },
        won: { $sum: { $cond: [{ $eq: ['$result.state', 'won'] }, 1, 0] } },
        total: { $sum: 1 },
        staked: { $sum: { $cond: [{ $ne: [{ $type: '$result.returns.pick' }, 'missing'] }, 1, 0] } },
        profit: { $sum: { $ifNull: ['$result.returns.pick', 0] } },
        valueStaked: { $sum: { $cond: [{ $ne: [{ $type: '$result.returns.value' }, 'missing'] }, 1, 0] } },
        valueProfit: { $sum: { $ifNull: ['$result.returns.value', 0] } },
      },
    },
  ]);
  const out = {};
  for (const { _id, won, total, staked, profit, valueStaked, valueProfit } of rows) {
    const s = (out[_id.sport] ||= { won: 0, settled: 0, featuredWon: 0, featuredSettled: 0, staked: 0, profit: 0, valueStaked: 0, valueProfit: 0 });
    s.won += won;
    s.settled += total;
    s.staked += staked;
    s.profit += profit;
    s.valueStaked += valueStaked;
    s.valueProfit += valueProfit;
    if (_id.featured) {
      s.featuredWon += won;
      s.featuredSettled += total;
    }
  }
  for (const s of Object.values(out)) {
    s.hitRate = s.settled ? s.won / s.settled : null;
    s.featuredHitRate = s.featuredSettled ? s.featuredWon / s.featuredSettled : null;
    // Return on stake at bookmaker prices: +0.05 means 5 units profit per 100 staked.
    s.roi = s.staked ? s.profit / s.staked : null;
    s.valueRoi = s.valueStaked ? s.valueProfit / s.valueStaked : null;
  }
  return { days, since, sports: out };
}

export async function listTips(userId, { sport, date } = {}) {
  const config = await TipsConfig.getSingleton();
  const enabled = SPORTS.filter((s) => config.sports[s]?.enabled);
  const chosen = enabled.includes(sport) ? sport : enabled[0];
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : utcDate();
  const full = await hasFullAccess(userId, config);

  const [items, counts, record] = await Promise.all([
    chosen ? Tip.find({ sport: chosen, date: day }).sort({ kickoff: 1, 'league.name': 1 }) : [],
    Tip.aggregate([{ $match: { date: day, sport: { $in: enabled } } }, { $group: { _id: '$sport', n: { $sum: 1 } } }]),
    chosen ? trackRecord({ sport: chosen }) : { sports: {} },
  ]);

  const now = new Date();
  let previewLeft = config.previewCount;
  const shaped = items.map((t) => {
    const json = t.toJSON();
    if (full || t.kickoff <= now) return json;
    if (previewLeft > 0) {
      previewLeft -= 1;
      return { ...json, preview: true };
    }
    return lockTip(json);
  });

  return {
    sport: chosen ?? null,
    date: day,
    sports: enabled,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    access: { full, previewCount: config.previewCount, plans: config.fullAccessPlans },
    record: record.sports[chosen] ?? null,
    items: shaped,
  };
}

// ---------------------------------------------------------------- admin

const logLoss = (p) => -Math.log(Math.max(1e-9, p));

/**
 * Model vs bookmakers vs combinations on settled tips that had both views. Tells staff which
 * market weight would have scored best, so the setting can follow real results.
 */
export async function oddsReport({ days = 90 } = {}) {
  const since = addDays(utcDate(), -days);
  const tips = await Tip.find({
    date: { $gte: since },
    'result.state': { $in: ['won', 'lost'] },
    'result.winner': { $exists: true },
    'prediction.model.probabilities': { $exists: true },
    'prediction.market.probabilities': { $exists: true },
  }).select('sport result.winner prediction.model prediction.market');

  const weights = Array.from({ length: 11 }, (_, i) => i / 10);
  const bySport = {};
  for (const t of tips) {
    const s = (bySport[t.sport] ||= { n: 0, modelHits: 0, marketHits: 0, loss: weights.map(() => 0) });
    const model = t.prediction.model.probabilities;
    const market = t.prediction.market.probabilities;
    const winner = t.result.winner;
    if (!(winner in market)) continue;
    s.n += 1;
    const top = (p) => Object.keys(p).reduce((a, b) => (p[a] >= p[b] ? a : b));
    s.modelHits += top(model) === winner;
    s.marketHits += top(market) === winner;
    weights.forEach((w, i) => {
      const mixed = Object.fromEntries(Object.keys(market).map((k) => [k, w * market[k] + (1 - w) * (model[k] ?? 0)]));
      const total = Object.values(mixed).reduce((a, b) => a + b, 0);
      s.loss[i] += logLoss(mixed[winner] / total);
    });
  }
  const sports = Object.fromEntries(Object.entries(bySport).map(([sport, s]) => {
    const losses = s.loss.map((l) => (s.n ? l / s.n : null));
    const best = losses.indexOf(Math.min(...losses));
    return [sport, {
      n: s.n,
      modelAccuracy: s.n ? s.modelHits / s.n : null,
      marketAccuracy: s.n ? s.marketHits / s.n : null,
      logLoss: Object.fromEntries(weights.map((w, i) => [w.toFixed(1), losses[i]])),
      bestWeight: s.n ? weights[best] : null,
    }];
  }));
  return { days, since, sports, minimumToTrust: 300 };
}

export async function adminListTips(query = {}) {
  const filter = {};
  if (SPORTS.includes(query.sport)) filter.sport = query.sport;
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.date || '')) filter.date = query.date;
  if (['pending', 'won', 'lost', 'void'].includes(query.state)) filter['result.state'] = query.state;
  if (query.featured === 'true') filter.featured = true;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const [items, total] = await Promise.all([
    Tip.find(filter).sort({ kickoff: -1 }).skip((page - 1) * limit).limit(limit),
    Tip.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function overrideResult(id, { state, note }, user) {
  const tip = await Tip.findById(id);
  if (!tip) throw ApiError.notFound('Tip not found');
  if (tip.kickoff > new Date()) throw ApiError.badRequest('This event has not started yet');
  tip.set('result.state', state);
  tip.set('result.note', note || `Set manually by ${user.firstName}`);
  // The winner isn't known from a manual result, so only the pick's return can be worked out.
  const odds = tip.prediction?.pick?.odds;
  tip.set('result.returns', state !== 'void' && odds ? { pick: unitReturn(state === 'won', odds) } : undefined);
  tip.set('result.settledAt', new Date());
  await tip.save();
  await settleCodes();
  await settleSlips();
  return tip;
}
