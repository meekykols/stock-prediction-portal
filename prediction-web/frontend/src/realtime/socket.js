import { io } from 'socket.io-client';
import { getAccessToken, refreshSession } from '../api/client';

// Same origin in development (Vite proxies /socket.io). In production, set VITE_SOCKET_URL
// to the API origin if the API is on a different domain.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    // Called on every (re)connect, so reconnects always use the latest access token.
    auth: (cb) => cb({ token: getAccessToken(), audience: 'customer' }),
  });

  let refreshing = false;
  socket.on('connect_error', async (err) => {
    if (err.message !== 'unauthorized' || refreshing) return;
    refreshing = true;
    try {
      await refreshSession();
      socket?.connect();
    } catch { /* signed out; AppLayout will disconnect */ } finally {
      refreshing = false;
    }
  });

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const getSocket = () => socket;
