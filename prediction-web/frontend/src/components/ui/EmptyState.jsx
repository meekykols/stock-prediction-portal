export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="max-w-md text-sm text-base-content/70">{children}</div>}
      {action}
    </div>
  );
}
