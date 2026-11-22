export default function Select({ value, onChange, options, label, className = '' }) {
  return (
    <select className={`select select-sm w-full sm:w-auto ${className}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
