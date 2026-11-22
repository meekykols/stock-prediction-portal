import { BookingCode, CodesConfig, Tip } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/paging.js';
import { combineSelections, evaluateSelection } from '../utils/sportsMarkets.js';
import { getCurrentEntitlement } from './subscription.service.js';

const DAY = 86400e3;
const RECENT_DAYS = 14;

// ---------------------------------------------------------------- settlement

/** Re-checks every undecided code whose selections are linked to tips. Returns how many were decided. */
export async function settleCodes() {
  const codes = await BookingCode.find({ status: 'active', 'result.state': 'pending', 'result.manual': { $ne: true } });
  if (!codes.length) return 0;
  const tipIds = [...new Set(codes.flatMap((c) => c.selections.filter((s) => s.tip).map((s) => String(s.tip))))];
  const tips = new Map((await Tip.find({ _id: { $in: tipIds } }).select('result')).map((t) => [String(t._id), t.result]));

  let decided = 0;
  for (const code of codes) {
    let changed = false;
    for (const sel of code.selections) {
      if (!sel.tip || sel.result !== 'pending') continue;
      const r = evaluateSelection(sel, tips.get(String(sel.tip)));
      if (r) { sel.result = r; changed = true; }
    }
    const state = combineSelections(code.selections.map((s) => s.result));
    if (state !== 'pending') {
      code.result = { state, settledAt: new Date(), manual: false };
      decided += 1;
      changed = true;
    }
    if (changed) await code.save();
  }
  return decided;
}

// ---------------------------------------------------------------- staff

async function activePlatform(slug) {
  const config = await CodesConfig.getSingleton();
  const p = config.platforms.find((x) => x.slug === slug);
  if (!p) throw ApiError.badRequest('Unknown betting platform', { platform: 'Choose a platform from the list' });
  if (!p.active) throw ApiError.badRequest(`${p.name} is switched off`, { platform: `${p.name} is switched off in settings` });
  return p;
}

/** Turns the staff form's selections into stored ones, pulling match details from linked tips. */
async function buildSelections(input = []) {
  const ids = input.filter((s) => s.tipId).map((s) => s.tipId);
  const tips = new Map((await Tip.find({ _id: { $in: ids } })).map((t) => [String(t._id), t]));
  const now = new Date();
  return input.map((s, i) => {
    const base = { market: s.market, outcome: s.outcome, line: s.market === 'total' ? s.line : undefined, result: 'pending' };
    if (!s.tipId) return { ...base, label: s.label, kickoff: s.kickoff ? new Date(s.kickoff) : undefined };
    const tip = tips.get(String(s.tipId));
    if (!tip) throw ApiError.badRequest(`Selection ${i + 1}: match not found`);
    if (tip.kickoff <= now) throw ApiError.badRequest(`Selection ${i + 1}: ${tip.home.name} v ${tip.away.name} has already started`);
    if (s.market === '1x2' && tip.sport !== 'football') throw ApiError.badRequest(`Selection ${i + 1}: use "winner" for ${tip.sport}`);
    if (['dc', 'btts'].includes(s.market) && tip.sport !== 'football') throw ApiError.badRequest(`Selection ${i + 1}: that market is football only`);
    return { ...base, tip: tip._id, sport: tip.sport, label: `${tip.home.name} v ${tip.away.name}`, league: tip.league?.name, kickoff: tip.kickoff };
  });
}

function expiryFor(selections, explicit) {
  const kickoffs = selections.map((s) => s.kickoff?.getTime()).filter(Boolean);
  const expiresAt = kickoffs.length ? new Date(Math.min(...kickoffs)) : explicit ? new Date(explicit) : null;
  if (!expiresAt) throw ApiError.badRequest('Set when the code expires', { expiresAt: 'Required when no selection has a kick-off time' });
  if (expiresAt <= new Date()) throw ApiError.badRequest('The code would already be expired', { expiresAt: 'The first match has already started' });
  return expiresAt;
}

async function assertNoDuplicate(platform, code, exceptId) {
  const clash = await BookingCode.findOne({
    platform, code: new RegExp(`^${escapeRegex(code)}$`, 'i'), status: 'active', expiresAt: { $gt: new Date() }, ...(exceptId && { _id: { $ne: exceptId } }),
  });
  if (clash) throw ApiError.conflict('That code is already posted for this platform');
}

export async function createCode(input, user) {
  await activePlatform(input.platform);
  await assertNoDuplicate(input.platform, input.code);
  const selections = await buildSelections(input.selections);
  return BookingCode.create({
    platform: input.platform,
    code: input.code,
    odds: input.odds,
    note: input.note,
    selections,
    expiresAt: expiryFor(selections, input.expiresAt),
    createdBy: user._id,
  });
}

export async function updateCode(id, input) {
  const code = await BookingCode.findById(id);
  if (!code) throw ApiError.notFound('Booking code not found');
  if (input.note !== undefined) code.note = input.note;
  if (input.odds !== undefined) code.odds = input.odds;
  const structural = ['platform', 'code', 'selections', 'expiresAt'].some((k) => input[k] !== undefined);
  if (structural) {
    if (code.expiresAt <= new Date()) throw ApiError.badRequest('This code has expired: only the note and odds can change');
    if (input.platform) { await activePlatform(input.platform); code.platform = input.platform; }
    if (input.code) code.code = input.code;
    await assertNoDuplicate(code.platform, code.code, code._id);
    if (input.selections) code.selections = await buildSelections(input.selections);
    code.expiresAt = expiryFor(code.selections, input.expiresAt ?? (code.selections.some((s) => s.kickoff) ? undefined : code.expiresAt));
  }
  await code.save();
  return code;
}

export async function withdrawCode(id) {
  const code = await BookingCode.findByIdAndUpdate(id, { status: 'withdrawn' }, { returnDocument: 'after' });
  if (!code) throw ApiError.notFound('Booking code not found');
  return code;
}

export async function setCodeResult(id, { state, note }, user) {
  const code = await BookingCode.findById(id);
  if (!code) throw ApiError.notFound('Booking code not found');
  if (code.expiresAt > new Date()) throw ApiError.badRequest('The first match has not started yet');
  code.result = { state, note: note || `Set manually by ${user.firstName}`, manual: state !== 'pending', settledAt: state === 'pending' ? undefined : new Date() };
  await code.save();
  if (state === 'pending') await settleCodes();
  return BookingCode.findById(id);
}

export async function setSelectionResult(id, index, state) {
  const code = await BookingCode.findById(id);
  if (!code) throw ApiError.notFound('Booking code not found');
  const sel = code.selections[index];
  if (!sel) throw ApiError.notFound('Selection not found');
  if (sel.kickoff && sel.kickoff > new Date()) throw ApiError.badRequest('That match has not started yet');
  sel.result = state;
  if (!code.result.manual) {
    const combined = combineSelections(code.selections.map((s) => s.result));
    code.result = { state: combined, settledAt: combined === 'pending' ? undefined : new Date(), manual: false };
  }
  await code.save();
  return code;
}

export async function adminListCodes(query = {}) {
  const filter = {};
  const now = new Date();
  if (query.view === 'live') Object.assign(filter, { status: 'active', expiresAt: { $gt: now } });
  if (query.view === 'started') Object.assign(filter, { status: 'active', expiresAt: { $lte: now } });
  if (query.view === 'withdrawn') filter.status = 'withdrawn';
  if (query.platform) filter.platform = String(query.platform);
  if (['pending', 'won', 'lost', 'void'].includes(query.result)) filter['result.state'] = query.result;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const [items, total] = await Promise.all([
    BookingCode.find(filter).sort({ expiresAt: -1 }).skip((page - 1) * limit).limit(limit).populate('createdBy', 'firstName lastName'),
    BookingCode.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Won/lost by platform and by staff member over the last `days`. */
export async function codeStats({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * DAY);
  const match = { status: 'active', expiresAt: { $gte: since }, 'result.state': { $in: ['won', 'lost'] } };
  const group = (key) => [
    { $match: match },
    { $group: { _id: key, won: { $sum: { $cond: [{ $eq: ['$result.state', 'won'] }, 1, 0] } }, settled: { $sum: 1 }, copies: { $sum: '$copies' } } },
    { $sort: { settled: -1 } },
  ];
  const [byPlatform, byStaffRaw] = await Promise.all([
    BookingCode.aggregate(group('$platform')),
    BookingCode.aggregate([...group('$createdBy'), { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } }]),
  ]);
  const byStaff = byStaffRaw.map(({ u, ...r }) => ({ ...r, name: u[0] ? `${u[0].firstName} ${u[0].lastName}` : 'Former staff' }));
  return { days, byPlatform, byStaff };
}

// ---------------------------------------------------------------- customers

async function canSee(userId, config) {
  if (!config.enabled || !userId) return false;
  const { plan } = await getCurrentEntitlement(userId);
  return Boolean(plan && config.visiblePlans.includes(plan.slug));
}

function shape(code, { reveal }) {
  const json = code.toJSON();
  const by = code.createdBy?.firstName;
  delete json.createdBy;
  delete json.copies;
  if (reveal) return { ...json, postedBy: by };
  return {
    id: json.id, platform: json.platform, odds: json.odds, expiresAt: json.expiresAt, createdAt: json.createdAt,
    selectionsCount: json.selections.length, sports: [...new Set(json.selections.map((s) => s.sport).filter(Boolean))],
    result: json.result, postedBy: by, locked: true,
  };
}

export async function listCodes(userId, { view = 'active', platform } = {}) {
  const config = await CodesConfig.getSingleton();
  const allowed = await canSee(userId, config);
  const now = new Date();
  const platforms = config.platforms.filter((p) => p.active);
  if (!config.enabled) return { enabled: false, access: { allowed: false, plans: [] }, platforms: [], items: [] };

  const base = { status: 'active', ...(platform && { platform: String(platform) }) };
  const filter = view === 'recent'
    ? { ...base, expiresAt: { $lte: now, $gte: new Date(now - RECENT_DAYS * DAY) } }
    : { ...base, expiresAt: { $gt: now } };
  const items = await BookingCode.find(filter).sort({ expiresAt: view === 'recent' ? -1 : 1 }).limit(60).populate('createdBy', 'firstName');

  // Codes are only worth hiding until the first match starts; afterwards they're the track record.
  return {
    enabled: true,
    access: { allowed, plans: config.visiblePlans },
    platforms,
    items: items.map((c) => shape(c, { reveal: allowed || c.expiresAt <= now })),
  };
}

export async function copyCode(userId, id) {
  const config = await CodesConfig.getSingleton();
  if (!(await canSee(userId, config))) {
    throw new ApiError(403, 'Booking codes are included in selected plans. Upgrade to copy codes.', undefined, 'plan_required');
  }
  const code = await BookingCode.findOneAndUpdate({ _id: id, status: 'active' }, { $inc: { copies: 1 } }, { returnDocument: 'after' });
  if (!code) throw ApiError.notFound('Booking code not found');
  return { code: code.code, platform: code.platform };
}
