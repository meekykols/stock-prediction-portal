const TONE = { W: 'bg-success text-success-content', D: 'bg-base-300 text-base-content', L: 'bg-error text-error-content' };

export default function FormPills({ form }) {
  if (!form) return <span className="text-base-content/40">—</span>;
  return (
    <span className="inline-flex gap-1">
      {form.split('').map((r, i) => (
        <span key={i} className={`grid size-5 place-items-center rounded text-[10px] font-bold ${TONE[r] || 'bg-base-300'}`}>{r}</span>
      ))}
    </span>
  );
}
