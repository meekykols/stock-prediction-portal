import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import StatusBadge from '../components/ui/StatusBadge';
import UserCell from '../components/ui/UserCell';
import EmptyState from '../components/ui/EmptyState';
import { billingApi, plansApi } from '../api/endpoints';
import { usePagedQuery } from '../hooks/usePagedQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate } from '../utils/format';

export default function Subscriptions() {
  useDocumentTitle('Subscriptions');
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  useEffect(() => { plansApi.list().then(setPlans).catch(() => {}); }, []);
  const { query, setQuery, data, loading, error } = usePagedQuery(billingApi.subscriptions, { status: 'live' });

  const columns = [
    { key: 'user', header: 'Customer', render: (s) => <UserCell user={s.user} /> },
    { key: 'plan', header: 'Plan', render: (s) => <span className="font-medium">{s.plan?.name}</span> },
    { key: 'status', header: 'Status', render: (s) => <div className="flex flex-wrap gap-1"><StatusBadge status={s.status} />{s.paymentIssueAt && <span className="badge badge-warning badge-sm">payment issue</span>}</div> },
    { key: 'source', header: 'Source', render: (s) => <StatusBadge status={s.source} />, hideOnMobile: true },
    { key: 'started', header: 'Started', render: (s) => formatDate(s.startsAt), hideOnMobile: true },
    { key: 'ends', header: 'Renews / ends', render: (s) => formatDate(s.endsAt) },
  ];

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Paid and complimentary plans. Open a customer to cancel or grant." />
      <div className="mb-4 flex flex-col flex-wrap gap-2 sm:flex-row">
        <SearchInput value={query.q || ''} onChange={(q) => setQuery({ q })} placeholder="Search customer" />
        <Select value={query.status} onChange={(status) => setQuery({ status })} label="Status" options={[
          { value: 'live', label: 'Active now' }, { value: '', label: 'All' }, { value: 'active', label: 'Auto-renewing' },
          { value: 'non_renewing', label: 'Non-renewing' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'expired', label: 'Expired' },
        ]} />
        <Select value={query.plan} onChange={(plan) => setQuery({ plan })} label="Plan" options={[{ value: '', label: 'All plans' }, ...plans.filter((p) => p.price > 0).map((p) => ({ value: p.id, label: p.name }))]} />
        <Select value={query.source} onChange={(source) => setQuery({ source })} label="Source" options={[{ value: '', label: 'All sources' }, { value: 'paystack', label: 'Paystack' }, { value: 'admin', label: 'Complimentary' }]} />
        <label className="label cursor-pointer gap-2 text-sm">
          <input type="checkbox" className="toggle toggle-warning toggle-sm" checked={query.issue === 'true'} onChange={(e) => setQuery({ issue: e.target.checked ? 'true' : '' })} />
          Payment issues only
        </label>
      </div>
      <DataTable columns={columns} rows={data?.items} loading={loading} error={error} onRowClick={(s) => s.user && navigate(`/users/${s.user.id}`)}
        empty={<EmptyState icon={BarChart3} title="No subscriptions match these filters" />} />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={(page) => setQuery({ page })} />
    </>
  );
}
