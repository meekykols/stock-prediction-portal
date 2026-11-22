import { io } from 'socket.io-client';
import { getAccessToken, refreshSession } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: getAccessToken(), audience: 'admin' }),
  });
  let refreshing = false;
  socket.on('connect_error', async (err) => {
    if (err.message !== 'unauthorized' || refreshing) return;
    refreshing = true;
    try { await refreshSession(); socket?.connect(); } catch { /* signed out */ } finally { refreshing = false; }
  });
  socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const getSocket = () => socket;
