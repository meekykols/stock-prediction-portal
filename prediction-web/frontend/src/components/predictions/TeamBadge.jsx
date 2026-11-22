export default function TeamBadge({ team, align = 'left', size = 'md' }) {
  const img = size === 'lg' ? 'size-14' : 'size-6';
  return (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''} ${size === 'lg' ? 'flex-col !text-center' : ''}`}>
      {team?.logo ? (
        <img src={team.logo} alt="" className={`${img} object-contain`} loading="lazy" />
      ) : (
        <div className={`${img} rounded-full bg-base-300`} />
      )}
      <span className={`${size === 'lg' ? 'font-display text-lg font-semibold' : 'text-sm font-medium'} truncate`}>{team?.name}</span>
    </div>
  );
}
