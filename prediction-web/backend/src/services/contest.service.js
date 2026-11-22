import crypto from 'node:crypto';
import {
  ContestConfig, ContestReward, Plan, Promo, Slip, Tip, TipsConfig, User,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { SPORTS } from '../constants/sports.js';
import {
  compareStandings, displayName, monthOf, pickResult, requiredPicks, scoreSlip, utcDate,
} from '../utils/contestScoring.js';
import { getCurrentEntitlement } from './subscription.service.js';
import { hasFullAccess } from './tips.service.js';
import { grantPlan } from './billing.service.js';

const OUTCOMES = { '1x2': ['home', 'draw', 'away'], winner: ['home', 'away'] };
const marketFor = (sport) => (sport === 'football' ? '1x2' : 'winner');

async function enabledSports() {
  const tc = await TipsConfig.getSingleton();
  return SPORTS.filter((s) => tc.sports[s]?.enabled);
}

async function eligibility(userId, config) {
  if (!config.enabled) return { canEnter: false, reason: 'The contest is paused right now.' };
  const { plan } = await getCurrentEntitlement(userId);
  const paid = Boolean(plan && plan.price > 0);
  if (!paid && !config.freeUsersCanEnter) return { canEnter: false, paid, reason: 'The contest is open to paid plans. Upgrade to take part.' };
  return { canEnter: true, paid };
}

async function dayInfo(date = utcDate()) {
  const sports = await enabledSports();
  const filter = { date, sport: { $in: sports } };
  const [total, upcoming] = await Promise.all([
    Tip.countDocuments(filter),
    Tip.find({ ...filter, kickoff: { $gt: new Date() } }).sort({ kickoff: 1, 'league.name': 1 }),
  ]);
  return { date, total, upcoming };
}

// ---------------------------------------------------------------- standings

async function standings(month) {
  const rows = await Slip.aggregate([
    { $match: { month, status: 'settled' } },
    {
      $group: {
        _id: '$user',
        points: { $sum: '$points' },
        correct: { $sum: '$correct' },
        wrong: { $sum: '$wrong' },
        slips: { $sum: 1 },
        perfectSlips: { $sum: { $cond: ['$perfect', 1, 0] } },
        lastScoredAt: { $max: { $cond: [{ $gt: ['$points', 0] }, '$settledAt', null] } },
      },
    },
  ]);
  rows.sort(compareStandings);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

export async function leaderboard(month = monthOf(utcDate()), { userId, limit = 50, full = false } = {}) {
  const rows = await standings(month);
  const top = rows.slice(0, limit);
  const users = new Map((await User.find({ _id: { $in: top.map((r) => r._id) } }).select('firstName lastName email avatar')).map((u) => [String(u._id), u]));
  const shape = (r) => {
    const u = users.get(String(r._id));
    return {
      rank: r.rank, points: r.points, correct: r.correct, wrong: r.wrong, slips: r.slips, perfectSlips: r.perfectSlips, lastScoredAt: r.lastScoredAt,
      name: displayName(u), avatar: u?.avatar?.url,
      ...(full && { userId: String(r._id), fullName: u ? `${u.firstName} ${u.lastName}` : null, email: u?.email }),
      ...(userId && { isMe: String(r._id) === String(userId) }),
    };
  };
  const mine = userId ? rows.find((r) => String(r._id) === String(userId)) : null;
  return {
    month,
    entrants: rows.length,
    rows: top.map(shape),
    me: mine ? { rank: mine.rank, points: mine.points, correct: mine.correct, wrong: mine.wrong, slips: mine.slips, perfectSlips: mine.perfectSlips } : null,
  };
}

// ---------------------------------------------------------------- customers

export async function contestState(userId) {
  const config = await ContestConfig.getSingleton();
  const [elig, day, slip, tipsConfig] = await Promise.all([
    eligibility(userId, config),
    dayInfo(),
    Slip.findOne({ user: userId, date: utcDate() }),
    TipsConfig.getSingleton(),
  ]);
  const showModel = await hasFullAccess(userId, tipsConfig);
  const month = monthOf(day.date);
  const options = slip ? [] : day.upcoming.map((t) => ({
    id: t.id, sport: t.sport, kickoff: t.kickoff, league: t.league, home: t.home, away: t.away, market: marketFor(t.sport),
    ...(showModel && { model: { outcome: t.prediction?.pick?.outcome, probability: t.prediction?.pick?.probability } }),
  }));
  const board = await leaderboard(month, { userId, limit: 10 });
  return {
    rules: {
      minPicks: config.minPicks, maxPicks: config.maxPicks, perfectMultiplier: config.perfectMultiplier,
      freeUsersCanEnter: config.freeUsersCanEnter, note: config.rulesNote,
    },
    eligibility: elig,
    today: (() => {
      const required = requiredPicks(config.minPicks, day.total);
      // Too few matches left to reach the minimum: today's entries are effectively closed.
      return { date: day.date, matches: day.total, available: day.upcoming.length, required, max: config.maxPicks, closed: day.upcoming.length < required };
    })(),
    slip,
    options,
    showModel,
    leaderboard: board,
  };
}

export async function submitSlip(userId, picksInput) {
  const config = await ContestConfig.getSingleton();
  const elig = await eligibility(userId, config);
  if (!elig.canEnter) throw new ApiError(403, elig.reason, undefined, 'contest_closed');

  const date = utcDate();
  if (await Slip.exists({ user: userId, date })) throw ApiError.conflict("You've already entered today's slip. Come back tomorrow.");

  const day = await dayInfo(date);
  const required = requiredPicks(config.minPicks, day.total);
  const ids = picksInput.map((p) => String(p.tipId));
  if (new Set(ids).size !== ids.length) throw ApiError.badRequest('Each match can only be picked once');
  if (ids.length < required) {
    throw ApiError.badRequest(`Pick at least ${required} match${required === 1 ? '' : 'es'} (you picked ${ids.length})`, { picks: `At least ${required}` });
  }
  if (ids.length > config.maxPicks) throw ApiError.badRequest(`Pick at most ${config.maxPicks} matches`, { picks: `At most ${config.maxPicks}` });

  const open = new Map(day.upcoming.map((t) => [t.id, t]));
  const picks = picksInput.map((p, i) => {
    const t = open.get(String(p.tipId));
    if (!t) throw ApiError.badRequest(`Pick ${i + 1} is not on today's list or has already kicked off`);
    const market = marketFor(t.sport);
    if (!OUTCOMES[market].includes(p.outcome)) throw ApiError.badRequest(`Pick ${i + 1}: a draw isn't an option in ${t.sport}`);
    return {
      tip: t._id, sport: t.sport, eventId: t.eventId, label: `${t.home.name} v ${t.away.name}`, league: t.league?.name, kickoff: t.kickoff,
      market, outcome: p.outcome, modelOutcome: t.prediction?.pick?.outcome, modelProbability: t.prediction?.pick?.probability,
    };
  });

  try {
    return await Slip.create({ user: userId, date, month: monthOf(date), picks, required });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict("You've already entered today's slip. Come back tomorrow.");
    throw err;
  }
}

export async function mySlips(userId, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(30, Math.max(1, Number(limit) || 10));
  const [items, total] = await Promise.all([
    Slip.find({ user: userId }).sort({ date: -1 }).skip((p - 1) * l).limit(l),
    Slip.countDocuments({ user: userId }),
  ]);
  return { items, total, page: p, pages: Math.max(1, Math.ceil(total / l)) };
}

export async function winners() {
  const rewards = await ContestReward.find().sort({ month: -1, rank: 1 }).limit(24).populate('user', 'firstName lastName avatar');
  return rewards.map((r) => ({ month: r.month, rank: r.rank, points: r.points, type: r.type, name: displayName(r.user), avatar: r.user?.avatar?.url }));
}

// ---------------------------------------------------------------- settlement

/** Settles picks from their tips' results; called by the hourly tips-settle job. */
export async function settleSlips() {
  const config = await ContestConfig.getSingleton();
  const slips = await Slip.find({ status: 'pending' });
  if (!slips.length) return 0;
  const tipIds = [...new Set(slips.flatMap((s) => s.picks.map((p) => String(p.tip))))];
  const tips = new Map((await Tip.find({ _id: { $in: tipIds } }).select('result')).map((t) => [String(t._id), t.result]));
  let settled = 0;
  for (const slip of slips) {
    let changed = false;
    for (const pick of slip.picks) {
      if (pick.result !== 'pending') continue;
      const r = pickResult(pick, tips.get(String(pick.tip)));
      if (r) { pick.result = r; changed = true; }
    }
    const score = scoreSlip(slip.picks.map((p) => p.result), config.perfectMultiplier);
    Object.assign(slip, { correct: score.correct, wrong: score.wrong, voided: score.voided });
    if (score.status === 'settled') {
      Object.assign(slip, { status: 'settled', perfect: score.perfect, points: score.points, settledAt: new Date() });
      settled += 1;
      changed = true;
    }
    if (changed) await slip.save();
  }
  return settled;
}

// ---------------------------------------------------------------- admin

export async function award(month, { userId, type, amount, note, days = 30 }, admin) {
  if (month >= monthOf(utcDate())) throw ApiError.badRequest('Rewards can be given once the month has ended');
  const board = await standings(month);
  const row = board.find((r) => String(r._id) === String(userId));
  if (!row) throw ApiError.badRequest('That customer has no settled slips in this month');
  if (await ContestReward.exists({ month, user: userId, type })) throw ApiError.conflict('This customer already has that reward for this month');

  const reward = new ContestReward({ month, user: userId, rank: row.rank, points: row.points, type, note, grantedBy: admin._id });
  if (type === 'cash') {
    reward.amount = Math.round(amount * 100);
  } else if (type === 'elite') {
    const plan = (await Plan.findOne({ slug: 'elite', isActive: true })) || (await Plan.findOne({ isActive: true }).sort({ price: -1 }));
    const sub = await grantPlan({ userId, planId: plan._id, days, note: `Picks contest prize, ${month}${note ? `: ${note}` : ''}`, grantedBy: admin._id });
    Object.assign(reward, { status: 'granted', subscription: sub._id });
  } else {
    const user = await User.findById(userId).select('firstName lastName');
    const promo = await Promo.create({
      title: `${user.firstName} ${user.lastName}`, body: '', owner: userId, createdBy: admin._id,
      label: `Picks champion · ${new Date(`${month}-01T00:00:00Z`).toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`,
    });
    reward.promo = promo._id;
  }
  await reward.save();
  if (reward.promo) await Promo.updateOne({ _id: reward.promo }, { reward: reward._id });
  return reward.populate([{ path: 'user', select: 'firstName lastName email' }, { path: 'promo' }]);
}

export async function markRewardPaid(id) {
  const reward = await ContestReward.findById(id);
  if (!reward) throw ApiError.notFound('Reward not found');
  if (reward.type !== 'cash') throw ApiError.badRequest('Only cash rewards are marked as paid');
  Object.assign(reward, { status: 'paid', paidAt: new Date() });
  return reward.save();
}

export function listRewards(month) {
  return ContestReward.find(month ? { month } : {}).sort({ month: -1, rank: 1 }).limit(100)
    .populate('user', 'firstName lastName email').populate('grantedBy', 'firstName lastName').populate('promo', 'title status startsAt endsAt');
}

// Stable pseudonym per customer, so analysts can follow one punter without knowing who it is.
const pseudonym = (userId) => crypto.createHmac('sha256', `${env.jwt.refreshSecret}:picks-export`).update(String(userId)).digest('hex').slice(0, 16);
const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Anonymised picks for model training: no names or emails, one row per pick. */
export async function exportPicksCsv({ from, to }) {
  const filter = { date: { $gte: from, $lte: to } };
  const header = ['slip_date', 'punter', 'sport', 'league', 'event_id', 'kickoff_utc', 'picked_at_utc', 'minutes_before_kickoff', 'market', 'pick', 'model_pick', 'model_probability', 'result', 'slip_status', 'slip_perfect'];
  const lines = [header.join(',')];
  for await (const slip of Slip.find(filter).sort({ date: 1 }).cursor()) {
    for (const p of slip.picks) {
      lines.push([
        slip.date, pseudonym(slip.user), p.sport, p.league, p.eventId, p.kickoff?.toISOString(), slip.createdAt.toISOString(),
        p.kickoff ? Math.round((p.kickoff - slip.createdAt) / 60000) : '', p.market, p.outcome, p.modelOutcome, p.modelProbability, p.result, slip.status, slip.perfect,
      ].map(csvCell).join(','));
    }
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------- promos

export async function activePromos() {
  const now = new Date();
  return Promo.find({ status: 'live', startsAt: { $lte: now }, endsAt: { $gt: now } }).sort({ startsAt: -1 }).limit(3)
    .select('title body imageUrl linkUrl linkLabel label endsAt');
}

export async function updatePromo(id, input) {
  const promo = await Promo.findById(id);
  if (!promo) throw ApiError.notFound('Advert not found');
  for (const k of ['title', 'body', 'imageUrl', 'linkUrl', 'linkLabel', 'label', 'startsAt', 'endsAt']) {
    if (input[k] !== undefined) promo[k] = input[k] === '' ? undefined : input[k];
  }
  if (input.status) promo.status = input.status;
  if (promo.status === 'live') {
    if (!promo.startsAt || !promo.endsAt || promo.endsAt <= promo.startsAt) throw ApiError.badRequest('Set a start and an end date (end after start) before going live');
    if (!promo.imageUrl && !promo.body) throw ApiError.badRequest('Add an image or some text before going live');
  }
  await promo.save();
  if (promo.reward) await ContestReward.updateOne({ _id: promo.reward }, { status: promo.status === 'live' ? 'live' : 'pending' });
  return promo;
}

/** Marks adverts whose end date has passed as ended. */
export async function endExpiredPromos() {
  const r = await Promo.updateMany({ status: 'live', endsAt: { $lte: new Date() } }, { status: 'ended' });
  return r.modifiedCount;
}
