const MAP = {
  active: 'badge-success', success: 'badge-success', resolved: 'badge-success',
  non_renewing: 'badge-warning', pending: 'badge-info', new: 'badge-info', read: 'badge-ghost',
  suspended: 'badge-error', failed: 'badge-error', cancelled: 'badge-ghost', expired: 'badge-ghost', abandoned: 'badge-ghost',
  admin: 'badge-secondary', paystack: 'badge-primary', free: 'badge-ghost',
};
const LABEL = { non_renewing: 'non-renewing', admin: 'complimentary' };

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  return <span className={`badge badge-soft badge-sm whitespace-nowrap capitalize ${MAP[status] || 'badge-ghost'} ${className}`}>{LABEL[status] || status}</span>;
}
