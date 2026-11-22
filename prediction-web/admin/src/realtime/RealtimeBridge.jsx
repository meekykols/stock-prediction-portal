import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket } from './socket';
import { conversationUpserted, loadConversations } from '../store/chatSlice';
import { useAuth } from '../hooks/useAuth';
import { P } from '../routers/permissions';
import { fullName } from '../utils/format';

/** Connects staff who can answer chat, keeps the inbox in sync and toasts new messages elsewhere in the console. */
export default function RealtimeBridge() {
  const dispatch = useDispatch();
  const store = useStore();
  const { user, can } = useAuth();
  const canChat = can(P.CHAT_RESPOND);

  useEffect(() => {
    if (!user?.id || !canChat) return undefined;
    dispatch(loadConversations(store.getState().chat.filter));
    const socket = connectSocket();
    const onMessage = ({ conversation, message }) => {
      dispatch(conversationUpserted(conversation));
      if (message.senderRole === 'customer' && !window.location.pathname.startsWith('/chat')) {
        toast(`${fullName(conversation.customer)}: ${message.body.slice(0, 80)}`, { icon: '💬' });
      }
    };
    const onConversation = ({ conversation }) => dispatch(conversationUpserted(conversation));
    socket.on('chat:message', onMessage);
    socket.on('chat:conversation', onConversation);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:conversation', onConversation);
      disconnectSocket();
    };
  }, [user?.id, canChat, dispatch, store]);

  return null;
}
