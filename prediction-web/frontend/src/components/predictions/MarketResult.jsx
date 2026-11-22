import { useMemo, useState } from 'react';
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Brain, Info, Minus } from 'lucide-react';
import { C, axisProps, downsample, tooltipStyle } from './chartTheme';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { assetLabel, axisNumber, formatDate, formatPct, formatPrice } from '../../utils/format';

const RANGES = [
  { key: '6M', days: 126 },
  { key: '1Y', days: 252 },
  { key: '3Y', days: 756 },
  { key: 'All', days: Infinity },
];

const TABS = [
  { key: 'price', label: 'Price & trend' },
  { key: 'forecast', label: 'Forecast' },
  { key: 'backtest', label: 'Backtest' },
];

function Metric({ label, value, hint, tone }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wider text-base-content/50">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone || ''}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-base-content/60">{hint}</p>}
    </div>
  );
}

function directionHint(acc) {
  if (acc === null || acc === undefined) return { tone: '', hint: 'Not enough data' };
  if (acc < 0.53) return { tone: 'text-warning', hint: 'Close to a coin flip for next-day direction' };
  if (acc < 0.6) return { tone: '', hint: 'Slightly better than chance' };
  return { tone: 'text-success', hint: 'Calls daily direction well' };
}

export default function MarketResult({ result }) {
  const { legal } = useSiteConfig();
  const [tab, setTab] = useState('price');
  const [range, setRange] = useState('1Y');
  const { currency, outlook, metrics, model } = result;
  const name = result.displayName || result.ticker;
  const money = (v) => formatPrice(v, currency, result.lastClose);
  const tick = (v) => axisNumber(v, result.lastClose);

  const priceRows = useMemo(() => {
    const { dates, close, ma100, ma200 } = result.history;
    const days = RANGES.find((r) => r.key === range).days;
    const start = Number.isFinite(days) ? Math.max(0, dates.length - days) : 0;
    const rows = [];
    for (let i = start; i < dates.length; i += 1) rows.push({ date: dates[i], close: close[i], ma100: ma100[i], ma200: ma200[i] });
    return downsample(rows);
  }, [result.history, range]);

  const backtestRows = useMemo(() => {
    const { dates, actual, predicted } = result.backtest;
    const days = RANGES.find((r) => r.key === range).days;
    const start = Number.isFinite(days) ? Math.max(0, dates.length - days) : 0;
    const rows = [];
    for (let i = start; i < dates.length; i += 1) rows.push({ date: dates[i], actual: actual[i], predicted: predicted[i] });
    return downsample(rows);
  }, [result.backtest, range]);

  const forecastRows = useMemo(() => {
    const { dates, close } = result.history;
    const tail = dates.slice(-60).map((d, i) => ({ date: d, close: close[close.length - 60 + i] }));
    // Bridge: the forecast line starts at the last real close.
    tail[tail.length - 1] = { ...tail[tail.length - 1], forecast: tail[tail.length - 1].close };
    return [...tail, ...result.forecast.map((f) => ({ date: f.date, forecast: f.price }))];
  }, [result.history, result.forecast]);

  const DirIcon = outlook.direction === 'up' ? ArrowUpRight : outlook.direction === 'down' ? ArrowDownRight : Minus;
  const dirTone = outlook.direction === 'up' ? 'text-success' : outlook.direction === 'down' ? 'text-error' : 'text-base-content/60';
  const dir = directionHint(metrics.directionalAccuracy);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/50">
                <span className="badge badge-primary badge-soft badge-sm">{assetLabel(result.assetClass)}</span>
                <span className="font-mono">{result.unit || currency || '—'} · last close {formatDate(result.lastDate)}</span>
              </div>
              <h2 className="mt-1 font-display text-4xl font-bold">{name}</h2>
              {result.symbol && result.symbol !== name && <p className="font-mono text-xs text-base-content/40">{result.symbol}</p>}
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold">{money(result.lastClose)}</p>
              <p className={`text-sm font-medium ${result.dayChangePct >= 0 ? 'text-success' : 'text-error'}`}>{formatPct(result.dayChangePct, 2)} on the day</p>
            </div>
          </div>
        </div>
        <div className="glass-card relative overflow-hidden p-6">
          <div className="glow-orb -right-10 -top-10 size-40 bg-secondary/30" />
          <p className="relative text-sm text-base-content/60">{outlook.horizonDays}-day model outlook</p>
          <div className="relative mt-2 flex items-center gap-2">
            <DirIcon className={`size-8 ${dirTone}`} />
            <span className="font-display text-3xl font-bold">{money(outlook.targetPrice)}</span>
          </div>
          <p className={`relative mt-1 text-sm font-medium ${dirTone}`}>{formatPct(outlook.changePct, 2)} vs last close</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Direction hit rate" value={`${Math.round((metrics.directionalAccuracy ?? 0) * 100)}%`} hint={dir.hint} tone={dir.tone} />
        <Metric label="Avg error (MAPE)" value={`${metrics.mape.toFixed(2)}%`} hint={`Typical miss: ${money(metrics.mae)} per day`} />
        <Metric label="Fit (R²)" value={metrics.r2.toFixed(3)} hint="How closely it tracked price levels" />
        <Metric label="RMSE" value={money(metrics.rmse)} hint={`Over ${metrics.testDays} test days`} />
      </div>

      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="tabs tabs-box tabs-sm">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)} aria-selected={tab === t.key}>
                {t.label}
              </button>
            ))}
          </div>
          {tab !== 'forecast' && (
            <div className="join">
              {RANGES.map((r) => (
                <button key={r.key} type="button" className={`btn join-item btn-xs ${range === r.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRange(r.key)}>{r.key}</button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            {tab === 'price' ? (
              <ComposedChart data={priceRows} margin={{ left: 4, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="closeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={C.primary} stopOpacity={0.3} />
                    <stop offset="1" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} minTickGap={48} />
                <YAxis {...axisProps} width={72} domain={['auto', 'auto']} tickFormatter={tick} />
                <Tooltip {...tooltipStyle} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="close" name="Close" stroke={C.primary} strokeWidth={2} fill="url(#closeFill)" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ma100" name="100-day avg" stroke={C.accent} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ma200" name="200-day avg" stroke={C.secondary} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            ) : tab === 'backtest' ? (
              <ComposedChart data={backtestRows} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} minTickGap={48} />
                <YAxis {...axisProps} width={72} domain={['auto', 'auto']} tickFormatter={tick} />
                <Tooltip {...tooltipStyle} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={C.primary} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="predicted" name="Model" stroke={C.secondary} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            ) : (
              <ComposedChart data={forecastRows} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} minTickGap={32} />
                <YAxis {...axisProps} width={72} domain={['auto', 'auto']} tickFormatter={tick} />
                <Tooltip {...tooltipStyle} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine x={result.lastDate} stroke={C.axis} strokeDasharray="3 3" label={{ value: 'Last close', fill: C.axis, fontSize: 11, position: 'insideTopLeft' }} />
                <Line type="monotone" dataKey="close" name="Close" stroke={C.primary} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke={C.secondary} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {tab === 'forecast' && (
          <div className="mt-6 overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Date</th><th className="text-right">Forecast</th><th className="text-right">vs last close</th></tr></thead>
              <tbody>
                {result.forecast.map((f) => (
                  <tr key={f.date}>
                    <td>{formatDate(f.date)}</td>
                    <td className="text-right font-mono">{money(f.price)}</td>
                    <td className="text-right font-mono">{formatPct((f.price / result.lastClose - 1) * 100, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'backtest' && (
          <p className="mt-4 text-xs text-base-content/60">
            The model only sees data up to each day, then predicts the next close. Lines that hug each other can still miss the direction of daily moves; check the hit rate above.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card flex gap-4 p-5">
          <Brain className="size-6 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">{model.name}</p>
            <p className="mt-1 font-mono text-xs text-base-content/60">{model.architecture}</p>
            <p className="mt-2 text-base-content/70">Trained on {model.trainedOn}. {model.notes}</p>
          </div>
        </div>
        <div className="glass-card flex gap-4 p-5">
          <Info className="size-6 shrink-0 text-warning" />
          <p className="text-sm text-base-content/70">
            Forecasts more than a day or two ahead are built by feeding the model its own predictions, so uncertainty grows with each step. {legal.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
