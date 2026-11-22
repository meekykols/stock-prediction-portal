import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCheck, Inbox, Mail, MailOpen, Reply } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Select from '../components/ui/Select';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { messagesApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { usePagedQuery } from '../hooks/usePagedQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime } from '../utils/format';

const wrap = (items) => ({ items, total: items.length, page: 1, pages: 1 });

export default function Messages() {
  useDocumentTitle('Messages');
  const { query, setQuery, data, loading, error, reload } = usePagedQuery((p) => messagesApi.list(p).then(wrap));
  const [openId, setOpenId] = useState(null);
  const items = data?.items || [];
  const open = items.find((m) => m.id === openId) || null;

  const setStatus = async (m, status) => {
    try { await messagesApi.setStatus(m.id, status); reload(); } catch (err) { toast.error(errorMessage(err)); }
  };
  const select = (m) => { setOpenId(m.id); if (m.status === 'new') setStatus(m, 'read'); };

  return (
    <>
      <PageHeader title="Messages" subtitle="Contact form submissions from the website." />
      <div className="mb-4">
        <Select value={query.status} onChange={(status) => setQuery({ status })} label="Status" options={[{ value: '', label: 'All' }, { value: 'new', label: 'New' }, { value: 'read', label: 'Read' }, { value: 'resolved', label: 'Resolved' }]} />
      </div>
      {error ? <div role="alert" className="alert alert-error alert-soft">{error}</div> : loading && !data ? <div className="skeleton h-80 rounded-box" /> : items.length === 0 ? (
        <EmptyState icon={Inbox} title="No messages here" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <ul className="glass-card max-h-[70vh] divide-y divide-base-content/10 overflow-y-auto lg:col-span-2">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => select(m)} className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-base-content/5 ${openId === m.id ? 'bg-primary/10' : ''}`}>
                  {m.status === 'new' ? <Mail className="mt-0.5 size-4 shrink-0 text-primary" /> : <MailOpen className="mt-0.5 size-4 shrink-0 text-base-content/40" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate ${m.status === 'new' ? 'font-semibold' : ''}`}>{m.name}</p>
                      <span className="shrink-0 text-xs text-base-content/50">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm text-base-content/70">{m.subject || m.message}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="glass-card p-6 lg:col-span-3">
            {!open ? <p className="text-sm text-base-content/60">Select a message to read it.</p> : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{open.subject || '(no subject)'}</h2>
                    <p className="text-sm text-base-content/60">{open.name} · <a href={`mailto:${open.email}`} className="link link-hover">{open.email}</a></p>
                    <p className="text-xs text-base-content/50">{formatDateTime(open.createdAt)}</p>
                  </div>
                  <StatusBadge status={open.status} />
                </div>
                <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{open.message}</p>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-base-content/10 pt-4">
                  <a className="btn btn-primary btn-sm" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject || 'Your message'}`)}`}><Reply className="size-4" /> Reply by email</a>
                  {open.status !== 'resolved'
                    ? <button type="button" className="btn btn-success btn-soft btn-sm" onClick={() => setStatus(open, 'resolved')}><CheckCheck className="size-4" /> Mark resolved</button>
                    : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus(open, 'read')}>Reopen</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
