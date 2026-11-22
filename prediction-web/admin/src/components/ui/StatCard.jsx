const TONES = {
  primary: 'from-primary/20 text-primary',
  secondary: 'from-secondary/20 text-secondary',
  accent: 'from-accent/20 text-accent',
  warning: 'from-warning/20 text-warning',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'primary' }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-base-content/60">{label}</p>
        {Icon && <div className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br to-transparent ${TONES[tone]}`}><Icon className="size-4" /></div>}
      </div>
      <p className="mt-3 font-display text-2xl font-bold sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-base-content/50">{hint}</p>}
    </div>
  );
}
