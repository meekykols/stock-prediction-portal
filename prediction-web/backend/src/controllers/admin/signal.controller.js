import { JobRun, Signal, SignalConfig } from '../../models/index.js';
import * as signals from '../../services/signals.service.js';
import { mlService } from '../../services/ml.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const config = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await SignalConfig.getSingleton() });
});

export const updateConfig = asyncHandler(async (req, res) => {
  const doc = await SignalConfig.getSingleton();
  if (req.body.enabled !== undefined) doc.enabled = req.body.enabled;
  const m = req.body.markets;
  if (m?.enabled !== undefined) doc.markets.enabled = m.enabled;
  if (m?.horizon !== undefined) doc.markets.horizon = m.horizon;
  if (m?.watchlist) {
    // Resolve every entry so typos are caught now rather than at 21:30.
    const invalid = [];
    for (const [assetClass, list] of Object.entries(m.watchlist)) {
      const clean = [...new Set((list || []).map((s) => String(s).trim()).filter(Boolean))];
      const checked = await Promise.all(clean.map((symbol) => mlService.resolveMarket({ assetClass, symbol })
        .then((inst) => inst.displayName).catch(() => { invalid.push(`${symbol} (${assetClass})`); return null; })));
      doc.markets.watchlist[assetClass] = [...new Set(checked.filter(Boolean))];
    }
    if (invalid.length) {
      return res.status(422).json({ success: false, message: `Not recognised: ${invalid.join(', ')}`, errors: { watchlist: invalid } });
    }
  }
  if (req.body.sports) doc.set('sports', { ...doc.sports.toObject(), ...req.body.sports });
  await doc.save();
  res.json({ success: true, message: 'Signal settings saved', data: doc });
});

export const runNow = asyncHandler(async (req, res) => {
  const run = req.body.job === 'market-signals' ? signals.runMarketSignals : signals.runSportsSignals;
  // Respond straight away; the run can take minutes. Progress shows in the runs list.
  if (signals.isRunning(req.body.job)) return res.status(409).json({ success: false, message: 'That job is already running' });
  run({ trigger: 'manual', triggeredBy: req.user._id }).catch((err) => console.error('[signals] manual run failed', err));
  res.status(202).json({ success: true, message: 'Run started' });
});

export const runs = asyncHandler(async (_req, res) => {
  const items = await JobRun.find().sort({ startedAt: -1 }).limit(20).populate('triggeredBy', 'firstName lastName');
  res.json({ success: true, data: { items, running: ['market-signals', 'sports-signals'].filter(signals.isRunning) } });
});

export const list = asyncHandler(async (req, res) => {
  const dates = (await Signal.distinct('runDate')).sort().reverse();
  const date = req.query.date || dates[0];
  const items = date ? await Signal.find({ runDate: date }).sort({ type: 1, strength: -1 }) : [];
  res.json({ success: true, data: { date: date ?? null, dates: dates.slice(0, 30), items } });
});
