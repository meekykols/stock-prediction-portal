import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Headset, Lock, MessageCircle, SendHorizonal, X } from 'lucide-react';
import { chatClosed, chatOpened, markChatRead, sendChat } from '../../store/chatSlice';
import { getSocket } from '../../realtime/socket';
import { useSiteConfig } from '../../hooks/useSiteConfig';

const time = (v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Bubble({ m }) {
  if (m.senderRole === 'system') {
    return <p className="mx-auto max-w-[85%] text-center text-xs text-base-content/50">{m.body}</p>;
  }
  const mine = m.senderRole === 'customer';
  return (
    <div className={`chat ${mine ? 'chat-end' : 'chat-start'}`}>
      {!mine && <div className="chat-header text-xs opacity-60">{m.senderName || 'Support'}</div>}
      <div className={`chat-bubble whitespace-pre-wrap break-words text-sm ${mine ? 'chat-bubble-primary' : ''}`}>{m.body}</div>
      <div className="chat-footer text-[10px] opacity-50">{time(m.createdAt)}</div>
    </div>
  );
}

export default function ChatWidget() {
  const dispatch = useDispatch();
  const { siteName, contact } = useSiteConfig();
  const { status, open, canChat, conversation, messages, staffTyping } = useSelector((s) => s.chat);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const lastTyping = useRef(0);
  const unread = conversation?.unread?.customer || 0;

  useEffect(() => {
    if (open && unread > 0) dispatch(markChatRead());
  }, [open, unread, dispatch]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, staffTyping, open]);

  if (status !== 'ready') return null;

  const onType = (v) => {
    setText(v);
    const now = Date.now();
    if (conversation?.status === 'open' && now - lastTyping.current > 2500) {
      lastTyping.current = now;
      getSocket()?.emit('chat:typing', { conversationId: conversation.id });
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await dispatch(sendChat(body));
    setSending(false);
    if (sendChat.fulfilled.match(res)) setText('');
    else toast.error(res.payload?.message || 'Message not sent');
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => dispatch(chatOpened())}
          className="btn btn-primary btn-circle btn-lg fixed bottom-5 right-5 z-40 shadow-xl shadow-primary/30"
          aria-label={unread ? `Open support chat, ${unread} unread` : 'Open support chat'}
        >
          <MessageCircle className="size-6" />
          {unread > 0 && <span className="badge badge-error badge-sm absolute -right-1 -top-1">{unread}</span>}
        </button>
      )}

      {open && (
        <section
          className="fixed inset-0 z-50 flex flex-col border-base-content/10 bg-base-100 shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[380px] sm:rounded-box sm:border"
          aria-label="Support chat"
        >
          <header className="flex items-center gap-3 border-b border-base-content/10 bg-gradient-to-r from-primary/15 to-secondary/15 px-4 py-3 sm:rounded-t-box">
            <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-content"><Headset className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{siteName} support</p>
              <p className="truncate text-xs text-base-content/60">{contact.supportHours || 'We reply as soon as we can'}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => dispatch(chatClosed())} aria-label="Close chat"><X className="size-4" /></button>
          </header>

          {!canChat ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Lock className="size-6" /></div>
              <p className="font-semibold">Live chat is a Pro and Elite feature</p>
              <p className="text-sm text-base-content/60">Upgrade to talk to our team in real time, or send us a message and we&apos;ll reply by email.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Link to="/app/billing" className="btn btn-primary btn-sm" onClick={() => dispatch(chatClosed())}>See plans</Link>
                <Link to="/contact" className="btn btn-ghost btn-sm">Contact form</Link>
              </div>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-live="polite">
                {messages.length === 0 && (
                  <p className="px-6 pt-10 text-center text-sm text-base-content/60">Hi! Ask us anything about your predictions, plan or account.</p>
                )}
                {messages.map((m) => <Bubble key={m.id} m={m} />)}
                {staffTyping && <p className="px-2 text-xs text-base-content/50">{staffTyping} is typing…</p>}
              </div>
              <form className="flex items-end gap-2 border-t border-base-content/10 p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <textarea
                  rows={1}
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Type a message…"
                  maxLength={2000}
                  className="textarea textarea-sm max-h-28 min-h-10 flex-1 resize-none"
                  aria-label="Message"
                />
                <button type="submit" className="btn btn-primary btn-square" disabled={!text.trim() || sending} aria-label="Send">
                  {sending ? <span className="loading loading-spinner loading-xs" /> : <SendHorizonal className="size-4" />}
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}
