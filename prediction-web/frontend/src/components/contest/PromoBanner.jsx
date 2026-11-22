import { useEffect, useState } from 'react';
import { ExternalLink, Trophy } from 'lucide-react';
import { contestApi } from '../../api/endpoints';

/** Live advert slots (e.g. the monthly picks champion's prize). Renders nothing when there are none. */
export default function PromoBanner({ className = '', compact = false }) {
  const [promos, setPromos] = useState([]);
  useEffect(() => { contestApi.promos().then(setPromos).catch(() => {}); }, []);
  if (!promos.length) return null;
  return (
    <div className={`grid gap-4 ${promos.length > 1 && !compact ? 'md:grid-cols-2' : ''} ${className}`}>
      {promos.map((p) => (
        <aside key={p.id} className={`glass-card flex flex-col overflow-hidden ${compact ? '' : 'sm:flex-row'}`} aria-label="Sponsored">
          {p.imageUrl && <img src={p.imageUrl} alt="" className={`h-40 w-full object-cover ${compact ? '' : 'sm:h-auto sm:w-48'}`} loading="lazy" />}
          <div className="flex flex-1 flex-col gap-2 p-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary"><Trophy className="size-3.5" />{p.label}</span>
            <h3 className="font-display text-lg font-semibold">{p.title}</h3>
            {p.body && <p className="text-sm text-base-content/70">{p.body}</p>}
            <div className="mt-auto flex items-center justify-between gap-3 pt-1">
              {p.linkUrl ? (
                <a href={p.linkUrl} target="_blank" rel="noopener noreferrer nofollow sponsored" className="btn btn-sm btn-primary btn-soft">
                  {p.linkLabel || 'Visit'}<ExternalLink className="size-3.5" />
                </a>
              ) : <span />}
              <span className="text-[10px] uppercase tracking-wider text-base-content/40">Sponsored</span>
            </div>
          </div>
        </aside>
      ))}
    </div>
  );
}
