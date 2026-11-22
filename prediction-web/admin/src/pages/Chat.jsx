import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { CheckCircle2, ExternalLink, MessagesSquare, SendHorizonal, UserCheck } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { chatApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { conversationUpserted, filterChanged, loadConversations } from '../store/chatSlice';
import { getSocket } from '../realtime/socket';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { P } from '../routers/permissions';
import { fullName, initials } from '../utils/format';

const ago = (v) => {
  const s = (Date.now() - new Date(v)) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const time = (v) => new Date(v).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

function Thread({ id, onChanged }) {
  const { user, can } = useAuth();
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);
  const lastTyping = useRef(0);

  const load = useCallback(() => {
    setData(null);
    chatApi.get(id).then((d) => { setData(d); chatApi.read(id).catch(() => {}); }).catch((e) => toast.error(errorMessage(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    let timer;
    const onMessage = ({ conversation, message }) => {
      if (conversation.id !== id) return;
      setData((d) => (d && !d.messages.some((m) => m.id === message.id)
        ? { ...d, conversation: { ...d.conversation, ...conversation }, messages: [...d.messages, message] } : d));
      if (message.senderRole === 'customer') { setTyping(false); chatApi.read(id).catch(() => {}); }
    };
    const onConversation = ({ conversation }) => {
      if (conversation.id === id) setData((d) => (d ? { ...d, conversation: { ...d.conversation, ...conversation } } : d));
    };
    const onTyping = ({ conversationId, from }) => {
      if (conversationId !== id || from !== 'customer') return;
      setTyping(true);
      clearTimeout(timer);
      timer = setTimeout(() => setTyping(false), 4000);
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:conversation', onConversation);
    socket.on('chat:typing', onTyping);
    return () => { clearTimeout(timer); socket.off('chat:message', onMessage); socket.off('chat:conversation', onConversation); socket.off('chat:typing', onTyping); };
  }, [id]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [data?.messages.length, typing]);

  if (!data) return <div className="skeleton h-full min-h-96 rounded-box" />;
  const { conversation: conv, messages, customerPlan } = data;

  const act = async (fn, msg) => {
    try { const c = await fn(); onChanged(c); setData((d) => ({ ...d, conversation: { ...d.conversation, ...c } })); toast.success(msg); } catch (e) { toast.error(errorMessage(e)); }
  };
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await chatApi.send(id, body);
      setText('');
      setData((d) => (d.messages.some((m) => m.id === res.message.id) ? d : { ...d, conversation: res.conversation, messages: [...d.messages, res.message] }));
      onChanged(res.conversation);
    } catch (e) { toast.error(errorMessage(e)); } finally { setSending(false); }
  };
  const onType = (v) => {
    setText(v);
    if (Date.now() - lastTyping.current > 2500) { lastTyping.current = Date.now(); getSocket()?.emit('chat:typing', { conversationId: id }); }
  };

  return (
    <div className="glass-card flex h-[calc(100vh-12rem)] min-h-96 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-base-content/10 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{fullName(conv.customer)}</p>
          <p className="truncate text-xs text-base-content/60">
            {conv.customer?.email} · {customerPlan?.name ?? 'Free'} plan{conv.assignedTo ? ` · assigned to ${conv.assignedTo.firstName}` : ' · unassigned'}
          </p>
        </div>
        {can(P.USERS_VIEW) && conv.customer && <Link to={`/users/${conv.customer.id}`} className="btn btn-ghost btn-xs"><ExternalLink className="size-3.5" /> Profile</Link>}
        {conv.assignedTo?.id !== user.id && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => act(() => chatApi.assign(id), 'Assigned to you')}><UserCheck className="size-3.5" /> Assign to me</button>
        )}
        {conv.status === 'open'
          ? <button type="button" className="btn btn-success btn-soft btn-xs" onClick={() => act(() => chatApi.close(id), 'Conversation closed')}><CheckCircle2 className="size-3.5" /> Close</button>
          : <span className="badge badge-ghost badge-sm">Closed</span>}
      </header>
      <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((m) => (m.senderRole === 'system' ? (
          <p key={m.id} className="py-2 text-center text-xs text-base-content/50">{m.body}</p>
        ) : (
          <div key={m.id} className={`chat ${m.senderRole === 'staff' ? 'chat-end' : 'chat-start'}`}>
            <div className="chat-header text-xs opacity-60">{m.senderRole === 'staff' ? m.senderName : conv.customer?.firstName}</div>
            <div className={`chat-bubble whitespace-pre-wrap break-words text-sm ${m.senderRole === 'staff' ? 'chat-bubble-primary' : ''}`}>{m.body}</div>
            <div className="chat-footer text-[10px] opacity-50">{time(m.createdAt)}</div>
          </div>
        )))}
        {typing && <p className="px-2 text-xs text-base-content/50">{conv.customer?.firstName} is typing…</p>}
      </div>
      <form className="flex items-end gap-2 border-t border-base-content/10 p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea rows={2} value={text} onChange={(e) => onType(e.target.value)} maxLength={2000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={conv.status === 'closed' ? 'Replying reopens this conversation…' : 'Reply… (Enter to send, Shift+Enter for a new line)'}
          className="textarea textarea-sm flex-1 resize-none" aria-label="Reply" />
        <button type="submit" className="btn btn-primary" disabled={!text.trim() || sending}>
          {sending ? <span className="loading loading-spinner loading-xs" /> : <SendHorizonal className="size-4" />} Send
        </button>
      </form>
    </div>
  );
}

export default function Chat() {
  useDocumentTitle('Support chat');
  const dispatch = useDispatch();
  const { items, status, filter } = useSelector((s) => s.chat);
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');

  useEffect(() => { dispatch(loadConversations(filter)); }, [dispatch, filter]);
  const setFilter = (patch) => dispatch(filterChanged(patch));
  const select = (id) => setParams({ c: id }, { replace: true });

  return (
    <>
      <PageHeader title="Support chat" subtitle="Live conversations with Pro and Elite customers." />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-base-content/10 p-3">
            <div role="tablist" className="tabs tabs-box tabs-xs">
              {['open', 'closed'].map((s) => (
                <button key={s} type="button" role="tab" className={`tab capitalize ${filter.status === s ? 'tab-active' : ''}`} onClick={() => setFilter({ status: s })}>{s}</button>
              ))}
            </div>
            <label className="label ml-auto cursor-pointer gap-2 text-xs">
              <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={filter.mine === 'true'} onChange={(e) => setFilter({ mine: e.target.checked ? 'true' : '' })} /> Mine
            </label>
          </div>
          {status === 'loading' && !items.length ? <div className="skeleton m-3 h-40" /> : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-base-content/60">No {filter.status} conversations.</p>
          ) : (
            <ul className="max-h-[calc(100vh-16rem)] divide-y divide-base-content/10 overflow-y-auto">
              {items.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => select(c.id)} className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-base-content/5 ${activeId === c.id ? 'bg-primary/10' : ''}`}>
                    <div className="avatar avatar-placeholder"><div className="w-9 rounded-full bg-base-300 text-xs font-semibold"><span>{initials(c.customer)}</span></div></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${c.unread.staff ? 'font-semibold' : ''}`}>{fullName(c.customer)}</p>
                        <span className="shrink-0 text-xs text-base-content/50">{ago(c.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-base-content/60">{c.lastMessage?.senderRole === 'staff' ? 'You: ' : ''}{c.lastMessage?.body}</p>
                        {c.unread.staff > 0 && <span className="badge badge-primary badge-xs">{c.unread.staff}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {activeId ? (
          <Thread key={activeId} id={activeId} onChanged={(c) => dispatch(conversationUpserted(c))} />
        ) : (
          <EmptyState icon={MessagesSquare} title="Pick a conversation">New customer messages appear here instantly.</EmptyState>
        )}
      </div>
    </>
  );
}
