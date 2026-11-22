export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon && <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></div>}
      <h3 className="font-semibold">{title}</h3>
      {children && <div className="max-w-md text-sm text-base-content/60">{children}</div>}
      {action}
    </div>
  );
}
