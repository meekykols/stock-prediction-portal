import { useNavigate } from 'react-router-dom';
import { Users as UsersIcon } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import StatusBadge from '../components/ui/StatusBadge';
import UserCell from '../components/ui/UserCell';
import EmptyState from '../components/ui/EmptyState';
import { usersApi } from '../api/endpoints';
import { usePagedQuery } from '../hooks/usePagedQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate, formatDateTime } from '../utils/format';

export default function Users() {
  useDocumentTitle('Customers');
  const navigate = useNavigate();
  const { query, setQuery, data, loading, error } = usePagedQuery(usersApi.list);

  const columns = [
    { key: 'user', header: 'Customer', render: (u) => <UserCell user={u} link={false} /> },
    { key: 'plan', header: 'Plan', render: (u) => (u.plan ? <span className="flex items-center gap-2">{u.plan.name}{u.plan.source === 'admin' && <StatusBadge status="admin" />}</span> : <span className="text-base-content/50">Free</span>) },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
    { key: 'joined', header: 'Joined', render: (u) => formatDate(u.createdAt), hideOnMobile: true },
    { key: 'last', header: 'Last sign-in', render: (u) => formatDateTime(u.lastLoginAt), hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who has signed up on the site." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={query.q || ''} onChange={(q) => setQuery({ q })} placeholder="Search name or email" />
        <Select value={query.status} onChange={(status) => setQuery({ status })} label="Status" options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
      </div>
      <DataTable
        columns={columns}
        rows={data?.items}
        loading={loading}
        error={error}
        onRowClick={(u) => navigate(`/users/${u.id}`)}
        empty={<EmptyState icon={UsersIcon} title="No customers found">{query.q ? 'Try a different search.' : 'Customers appear here once they sign up.'}</EmptyState>}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={(page) => setQuery({ page })} />
    </>
  );
}
