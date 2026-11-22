import { CreditCard } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import StatusBadge from '../components/ui/StatusBadge';
import UserCell from '../components/ui/UserCell';
import EmptyState from '../components/ui/EmptyState';
import { billingApi } from '../api/endpoints';
import { usePagedQuery } from '../hooks/usePagedQuery';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime, formatMoney } from '../utils/format';

export default function Payments() {
  useDocumentTitle('Payments');
  const { currency } = useSiteConfig();
  const { query, setQuery, data, loading, error } = usePagedQuery(billingApi.payments);
  const money = (v, c) => formatMoney(v, c, currency.locale);

  const columns = [
    { key: 'date', header: 'Date', render: (p) => <span className="whitespace-nowrap">{formatDateTime(p.paidAt || p.createdAt)}</span> },
    { key: 'user', header: 'Customer', render: (p) => <UserCell user={p.user} /> },
    { key: 'plan', header: 'Plan', render: (p) => p.plan?.name, hideOnMobile: true },
    { key: 'kind', header: 'Type', render: (p) => <span className="capitalize">{p.kind}</span>, hideOnMobile: true },
    { key: 'amount', header: 'Amount', className: 'text-right', render: (p) => <span className="font-mono">{money(p.amount, p.currency)}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'ref', header: 'Reference', render: (p) => <span className="font-mono text-xs text-base-content/60">{p.reference}</span>, hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader title="Payments" subtitle="Every Paystack charge: first payments and renewals." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={query.q || ''} onChange={(q) => setQuery({ q })} placeholder="Search customer" />
        <Select value={query.status} onChange={(status) => setQuery({ status })} label="Status" options={[
          { value: '', label: 'All statuses' }, { value: 'success', label: 'Successful' }, { value: 'pending', label: 'Pending' },
          { value: 'failed', label: 'Failed' }, { value: 'abandoned', label: 'Abandoned' },
        ]} />
        <Select value={query.kind} onChange={(kind) => setQuery({ kind })} label="Type" options={[{ value: '', label: 'All types' }, { value: 'initial', label: 'First payment' }, { value: 'renewal', label: 'Renewal' }]} />
      </div>
      {data?.totals?.length > 0 && (
        <p className="mb-3 text-sm text-base-content/70">
          Successful in this view: {data.totals.map((t) => <span key={t._id} className="font-mono font-semibold">{money(t.amount, t._id)}</span>)}
        </p>
      )}
      <DataTable columns={columns} rows={data?.items} loading={loading} error={error}
        empty={<EmptyState icon={CreditCard} title="No payments found" />} />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={(page) => setQuery({ page })} />
    </>
  );
}
