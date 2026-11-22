import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector, useStore } from 'react-redux';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket } from './socket';
import {
  chatConversationUpdated, chatMessageReceived, chatReset, loadChat, markChatRead, staffTyping,
} from '../store/chatSlice';

/** Owns the socket for the signed-in customer and turns server events into store updates and toasts. */
export default function RealtimeBridge() {
  const dispatch = useDispatch();
  const store = useStore();
  const userId = useSelector((s) => s.auth.user?.id);
  // Chat access and the premium room depend on the plan, so reconnect when it changes.
  const planId = useSelector((s) => s.auth.subscription?.plan?.id);

  useEffect(() => {
    if (!userId) return undefined;
    dispatch(loadChat());
    const socket = connectSocket();
    let typingTimer;

    socket.on('chat:message', (payload) => {
      dispatch(chatMessageReceived(payload));
      if (payload.message.senderRole !== 'staff') return;
      if (store.getState().chat.open) dispatch(markChatRead());
      else toast(`${payload.message.senderName || 'Support'}: ${payload.message.body.slice(0, 80)}`, { icon: '💬' });
    });
    socket.on('chat:conversation', (payload) => dispatch(chatConversationUpdated(payload)));
    socket.on('chat:typing', ({ from, name }) => {
      if (from !== 'staff') return;
      dispatch(staffTyping(name || 'Support'));
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => dispatch(staffTyping(null)), 4000);
    });
    socket.on('signals:new', ({ count }) => {
      toast((t) => (
        <span className="text-sm">
          {count} new signal{count === 1 ? '' : 's'} published.{' '}
          <Link to="/app/signals" className="link link-primary font-medium" onClick={() => toast.dismiss(t.id)}>View</Link>
        </span>
      ), { icon: '⚡', duration: 8000 });
    });

    return () => {
      clearTimeout(typingTimer);
      disconnectSocket();
      dispatch(chatReset());
    };
  }, [userId, planId, dispatch, store]);

  return null;
}
