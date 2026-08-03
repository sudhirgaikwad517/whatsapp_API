import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '@prowexa/shared-types';

export interface SocketUser {
  userId: string;
  email: string;
  organizationId: string;
  role: UserRole;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

let ioInstance: Server | null = null;

/**
 * Initialize Socket.IO server with JWT authentication middleware.
 * Multiplexes connections into tenant-isolated rooms (`org:${organizationId}`).
 */
export function initSocketServer(httpServer: any): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token required.'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as SocketUser;
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    const orgRoom = `org:${user.organizationId}`;

    // Join tenant-scoped room
    socket.join(orgRoom);
    logger.info({ userId: user.userId, organizationId: user.organizationId, socketId: socket.id }, 'Agent connected to Socket.IO');

    // Handle typing status indicator
    socket.on('typing_start', (data: { conversationId: string }) => {
      socket.to(orgRoom).emit('agent_typing', {
        conversationId: data.conversationId,
        userId: user.userId,
      });
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      socket.to(orgRoom).emit('agent_stopped_typing', {
        conversationId: data.conversationId,
        userId: user.userId,
      });
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user.userId, socketId: socket.id }, 'Agent disconnected from Socket.IO');
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Get active Socket.IO server instance for broadcasting events from workers/services.
 */
export function getSocketInstance(): Server | null {
  return ioInstance;
}

/**
 * Broadcast event to all agents connected in a specific organization.
 */
export function emitToOrganization(organizationId: string, event: string, payload: any): void {
  if (ioInstance) {
    ioInstance.to(`org:${organizationId}`).emit(event, payload);
  }
}
