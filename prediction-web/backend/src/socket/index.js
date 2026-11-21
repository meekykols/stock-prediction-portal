import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { AUDIENCE, verifyAccessToken } from '../utils/tokens.js';
import { ROLES } from '../utils/permissions.js';

let io;

/**
 * Socket.IO bootstrap. Clients connect with { auth: { token, audience } }.
 * Each user joins `user:<id>`; staff also join `staff`. Live chat events land in Phase 6.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrls, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const { token, audience = AUDIENCE.CUSTOMER } = socket.handshake.auth || {};
      const payload = verifyAccessToken(token, audience);
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active') return next(new Error('unauthorized'));
      socket.data.user = { id: String(user._id), role: user.role, audience };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, audience } = socket.data.user;
    socket.join(`user:${id}`);
    if (audience === AUDIENCE.ADMIN && role !== ROLES.CUSTOMER) socket.join('staff');
  });

  return io;
}

export const getIO = () => io;
