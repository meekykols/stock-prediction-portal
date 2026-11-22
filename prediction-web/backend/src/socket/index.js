import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { Conversation, User } from '../models/index.js';
import { AUDIENCE, verifyAccessToken } from '../utils/tokens.js';
import { hasPermission, PERMISSIONS, ROLES } from '../utils/permissions.js';
import { getCurrentEntitlement } from '../services/subscription.service.js';

let io;

export const ROOMS = {
  user: (id) => `user:${id}`,
  staffChat: 'staff:chat',
  premium: 'premium',
};

/**
 * Clients connect with { auth: { token, audience } } using their access token.
 * Rooms: every user → user:<id>; staff who can answer chat → staff:chat;
 * customers whose plan includes premium signals → premium.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientUrls, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const { token, audience = AUDIENCE.CUSTOMER } = socket.handshake.auth || {};
      const payload = verifyAccessToken(token, audience);
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active') return next(new Error('unauthorized'));
      if (audience === AUDIENCE.ADMIN && user.role === ROLES.CUSTOMER) return next(new Error('unauthorized'));
      socket.data.user = {
        id: String(user._id),
        role: user.role,
        audience,
        firstName: user.firstName,
        canChat: audience === AUDIENCE.ADMIN && hasPermission(user, PERMISSIONS.CHAT_RESPOND),
      };
      if (audience === AUDIENCE.CUSTOMER) {
        const { plan } = await getCurrentEntitlement(user._id);
        socket.data.user.premium = Boolean(plan?.limits?.premiumSignals);
      }
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const me = socket.data.user;
    socket.join(ROOMS.user(me.id));
    if (me.canChat) socket.join(ROOMS.staffChat);
    if (me.premium) socket.join(ROOMS.premium);

    // Typing indicator, relayed only to the other side of a conversation this socket may see.
    socket.on('chat:typing', async ({ conversationId } = {}) => {
      try {
        if (!conversationId) return;
        if (me.audience === AUDIENCE.CUSTOMER) {
          const owns = await Conversation.exists({ _id: conversationId, customer: me.id, status: 'open' });
          if (owns) socket.to(ROOMS.staffChat).emit('chat:typing', { conversationId, from: 'customer' });
        } else if (me.canChat) {
          const conv = await Conversation.findById(conversationId).select('customer');
          if (conv) io.to(ROOMS.user(conv.customer)).emit('chat:typing', { conversationId, from: 'staff', name: me.firstName });
        }
      } catch { /* ignore malformed ids */ }
    });
  });

  return io;
}

export const getIO = () => io;

export function emitTo(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}
