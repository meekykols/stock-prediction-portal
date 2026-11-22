/**
 * Decorative hero visual: an animated "actual vs forecast" line pair.
 * The curves are illustrative and labelled as such; real charts come from the ML service.
 */
const ACTUAL = 'M0,150 C40,140 60,160 90,130 S150,90 180,110 S240,150 270,100 S330,40 360,70 S420,90 450,50';
const FORECAST = 'M0,155 C40,135 65,150 92,128 S150,98 182,106 S240,140 272,104 S330,50 362,66 S420,80 450,44';

export default function ForecastVisual() {
  return (
    <svg viewBox="0 0 450 190" className="h-auto w-full" role="img" aria-label="Illustrative forecast chart">
      <defs>
        <linearGradient id="fv-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="0" x2="450" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" />
      ))}
      <path d={`${ACTUAL} L450,190 L0,190 Z`} fill="url(#fv-fill)" />
      <path
        d={ACTUAL}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeDasharray="900"
        strokeDashoffset="900"
        className="animate-draw"
      />
      <path
        d={FORECAST}
        fill="none"
        stroke="var(--color-secondary)"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="opacity-90"
      />
      <circle cx="450" cy="44" r="5" fill="var(--color-secondary)">
        <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
