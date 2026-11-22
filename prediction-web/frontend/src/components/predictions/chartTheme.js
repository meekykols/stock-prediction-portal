// Recharts accepts CSS variables in SVG attributes, so charts follow the daisyUI theme.
export const C = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  accent: 'var(--color-accent)',
  warning: 'var(--color-warning)',
  grid: 'color-mix(in oklch, var(--color-base-content) 8%, transparent)',
  axis: 'color-mix(in oklch, var(--color-base-content) 50%, transparent)',
};

export const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-base-200)',
    border: '1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent)',
    borderRadius: '0.75rem',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--color-base-content)', marginBottom: 4 },
  itemStyle: { padding: 0 },
};

export const axisProps = {
  stroke: C.axis,
  tick: { fontSize: 11, fill: C.axis },
  tickLine: false,
  axisLine: false,
};

/** Keeps charts fast on 10 years of daily data. Always keeps the last point. */
export function downsample(rows, max = 600) {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  const out = rows.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== rows[rows.length - 1]) out.push(rows[rows.length - 1]);
  return out;
}
