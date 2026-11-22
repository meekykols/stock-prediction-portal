import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page = 1, pages = 1, total, onPage }) {
  if (!total) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-base-content/60">{total.toLocaleString()} result{total === 1 ? '' : 's'}</span>
      {pages > 1 && (
        <div className="join">
          <button type="button" className="btn join-item btn-sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="size-4" /></button>
          <span className="btn join-item btn-sm pointer-events-none">Page {page} of {pages}</span>
          <button type="button" className="btn join-item btn-sm" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page"><ChevronRight className="size-4" /></button>
        </div>
      )}
    </div>
  );
}
