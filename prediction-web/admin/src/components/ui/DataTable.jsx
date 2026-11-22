import EmptyState from './EmptyState';

/**
 * columns: [{ key, header, render?(row), className?, hideOnMobile? }]
 * Rows become clickable when onRowClick is given.
 */
export default function DataTable({ columns, rows, loading, error, empty, onRowClick, rowKey = (r) => r.id }) {
  if (error) return <div role="alert" className="alert alert-error alert-soft">{error}</div>;
  if (loading && !rows) return <div className="skeleton h-72 rounded-box" />;
  if (!rows?.length) return empty || <EmptyState title="Nothing to show" />;

  return (
    <div className={`glass-card overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <table className="table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={`${c.className || ''} ${c.hideOnMobile ? 'hidden md:table-cell' : ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'cursor-pointer hover:bg-base-content/5' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={`${c.className || ''} ${c.hideOnMobile ? 'hidden md:table-cell' : ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
