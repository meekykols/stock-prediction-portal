import { Prediction, PREDICTION_TYPES } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getCurrentEntitlement } from './subscription.service.js';
import { mlService } from './ml.service.js';

const LIMIT_FIELD = {
  [PREDICTION_TYPES.MARKET]: 'marketPredictionsPerDay',
  [PREDICTION_TYPES.SPORTS]: 'sportsPredictionsPerDay',
};

const startOfUtcDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export async function getUsage(userId, plan) {
  const since = startOfUtcDay();
  const counts = await Prediction.aggregate([
    { $match: { user: userId, createdAt: { $gte: since } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const used = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  const resetsAt = new Date(since.getTime() + 24 * 60 * 60 * 1000);

  return Object.fromEntries(
    Object.values(PREDICTION_TYPES).map((type) => {
      const limit = plan?.limits?.[LIMIT_FIELD[type]] ?? 0;
      const count = used[type] || 0;
      return [type, { used: count, limit, remaining: limit === -1 ? null : Math.max(0, limit - count), resetsAt }];
    }),
  );
}

async function assertQuota(userId, type) {
  const { plan } = await getCurrentEntitlement(userId);
  const usage = (await getUsage(userId, plan))[type];
  if (usage.limit !== -1 && usage.used >= usage.limit) {
    const what = type === PREDICTION_TYPES.MARKET ? 'market' : 'sports';
    throw new ApiError(
      429,
      `You've used all ${usage.limit} ${what} predictions on the ${plan?.name ?? 'current'} plan today. Upgrade for more, or come back after midnight UTC.`,
      undefined,
      'quota_exceeded',
    );
  }
}

/** Same request again today → return the saved one without spending quota. */
function findTodaysRepeat(userId, key) {
  return Prediction.findOne({ user: userId, key, createdAt: { $gte: startOfUtcDay() } })
    .sort({ createdAt: -1 })
    .select('+result');
}

function marketSummary(r) {
  return {
    assetClass: r.assetClass,
    symbol: r.symbol,
    displayName: r.displayName,
    unit: r.unit,
    currency: r.currency,
    lastClose: r.lastClose,
    lastDate: r.lastDate,
    targetPrice: r.outlook.targetPrice,
    changePct: r.outlook.changePct,
    direction: r.outlook.direction,
    horizonDays: r.outlook.horizonDays,
    r2: r.metrics.r2,
    directionalAccuracy: r.metrics.directionalAccuracy,
    upDaysRate: r.metrics.upDaysRate,
    range80: r.ranges?.final?.p80,
    rangeCoverage: r.ranges?.trackRecord?.coverage,
  };
}

function sportsSummary(r) {
  const { fixture, prediction } = r;
  return {
    kickoff: fixture.kickoff,
    league: fixture.league?.name,
    home: fixture.home?.name,
    away: fixture.away?.name,
    homeLogo: fixture.home?.logo,
    awayLogo: fixture.away?.logo,
    pick: prediction.pick,
    probabilities: prediction.probabilities,
    expectedGoals: prediction.expectedGoals,
    confidence: prediction.confidence,
  };
}

async function create(userId, type, input, key, runModel, summarize) {
  const repeat = await findTodaysRepeat(userId, key);
  if (repeat) return { prediction: repeat, reused: true };

  await assertQuota(userId, type);
  const result = await runModel();
  const prediction = await Prediction.create({ user: userId, type, input, key, result, summary: summarize(result) });
  return { prediction, reused: false };
}

export async function createMarketPrediction(userId, { assetClass, symbol, horizon }) {
  // Resolve first so "EUR/USD", "eurusd" and "EURUSD=X" count as the same request.
  const inst = await mlService.resolveMarket({ assetClass, symbol });
  return create(
    userId,
    PREDICTION_TYPES.MARKET,
    { assetClass, symbol: inst.symbol, horizon },
    `market:${inst.symbol}:${horizon}`,
    () => mlService.predictMarket({ assetClass, symbol: inst.symbol, horizon }),
    marketSummary,
  );
}

export function createSportsPrediction(userId, { fixtureId }) {
  return create(
    userId,
    PREDICTION_TYPES.SPORTS,
    { fixtureId },
    `sports:${fixtureId}`,
    () => mlService.predictSports({ fixtureId }),
    sportsSummary,
  );
}

export async function listPredictions(userId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const type = Object.values(PREDICTION_TYPES).includes(query.type) ? query.type : undefined;
  const filter = { user: userId, ...(type && { type }) };
  const [items, total] = await Promise.all([
    Prediction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Prediction.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}

export async function getPrediction(userId, id) {
  const prediction = await Prediction.findOne({ _id: id, user: userId }).select('+result');
  if (!prediction) throw ApiError.notFound('Prediction not found');
  return prediction;
}
